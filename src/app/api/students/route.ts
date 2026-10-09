import { NextResponse } from 'next/server';
import { UserRole } from '@/generated/prisma/client';
import { prisma } from '@/lib/prisma';
import { activeRoleHolders } from '@/lib/rbac/queries';
import { getServerAuthenticatedUser } from '@/lib/auth';
import { withApiLogging } from '@/lib/api-logging';

const DEFAULT_STUDENT_LIMIT = 100;
const MAX_STUDENT_LIMIT = 200;

const departmentAliases: Record<string, string[]> = {
  ict: ['ICT', 'IT', 'BSIT', 'Information Technology'],
  it: ['ICT', 'IT', 'BSIT', 'Information Technology'],
  bsit: ['ICT', 'IT', 'BSIT', 'Information Technology'],
  'information technology': ['ICT', 'IT', 'BSIT', 'Information Technology'],
  met: ['MET', 'BSMET', 'Manufacturing Engineering Technology', 'Manufacturing Eng. Tech.', 'Mechanical Engineering Technology'],
  bsmet: ['MET', 'BSMET', 'Manufacturing Engineering Technology', 'Manufacturing Eng. Tech.', 'Mechanical Engineering Technology'],
  tcm: ['TCM', 'BSTCM', 'Technology Communication Management'],
  bstcm: ['TCM', 'BSTCM', 'Technology Communication Management'],
  esm: ['ESM', 'BSESM', 'Energy Systems and Management', 'Energy Systems & Mgmt.', 'Environmental and Safety Management'],
  bsesm: ['ESM', 'BSESM', 'Energy Systems and Management', 'Energy Systems & Mgmt.', 'Environmental and Safety Management'],
  name: ['NAME', 'BSNAME', 'Naval Architecture and Marine Engineering'],
  bsname: ['NAME', 'BSNAME', 'Naval Architecture and Marine Engineering']
};

function getDepartmentSearchTerms(value: string | null) {
  const normalized = String(value || '').trim();

  if (!normalized) {
    return [];
  }

  const key = normalized.toLowerCase();
  return Array.from(new Set([normalized, ...(departmentAliases[key] || [])]));
}

function parsePositiveInteger(value: string | null, fallback: number, max: number) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  return Math.min(max, Math.floor(parsed));
}

async function handleGET(request: Request) {
  try {
    const user = await getServerAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const requestedDepartment = searchParams.get('department');
    const isGlobalAdmin = ['ADMIN', 'SYSTEM_ADMIN', 'RESEARCH_HEAD', 'TECH_TRANSFER', 'LIBRARY'].includes(user.role);
    
    // Enforce department boundary unless global admin
    const userDeptClean = user.department ? user.department.replace(/\s+(Department|Office)$/i, '').trim() : null;
    const department = isGlobalAdmin ? requestedDepartment : (userDeptClean || requestedDepartment);
    const departmentTerms = getDepartmentSearchTerms(department);
    const limit = parsePositiveInteger(searchParams.get('limit'), DEFAULT_STUDENT_LIMIT, MAX_STUDENT_LIMIT);
    const page = parsePositiveInteger(searchParams.get('page'), 1, Number.MAX_SAFE_INTEGER);
    const availableOnly = searchParams.get('availableOnly') === 'true';

    const whereClause: any = activeRoleHolders([UserRole.STUDENT]);
    if (departmentTerms.length) {
      whereClause.OR = departmentTerms.map((term) => ({
        department: {
          contains: term,
          mode: 'insensitive'
        }
      }));
    }

    const students = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        firstName: true,
        lastName: true,
        studentId: true,
        department: true
      },
      orderBy: { name: 'asc' },
      skip: (page - 1) * limit,
      take: limit
    });
    
    if (availableOnly) {
      const allGroups = await prisma.group.findMany({
        select: { students: true }
      });
      
      const assignedNames = new Set(allGroups.flatMap(g => g.students.map(s => s.trim().toLowerCase())));
      
      const filtered = students.filter(student => !assignedNames.has(student.name.trim().toLowerCase()));
      return NextResponse.json(filtered);
    }
    
    return NextResponse.json(students);
  } catch (error) {
    console.error('Error fetching students:', error);
    return NextResponse.json({ error: 'Failed to fetch students' }, { status: 500 });
  }
}

export const GET = withApiLogging('GET', '/api/students', handleGET);
