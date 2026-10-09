
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuthenticatedUser } from '@/lib/auth';
import { UserRole } from '@/generated/prisma/client';
import { withApiLogging } from '@/lib/api-logging';

const DEFAULT_EVALUATION_LIMIT = 50;
const MAX_EVALUATION_LIMIT = 100;

function parsePositiveInteger(value: string | null, fallback: number, max: number) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  return Math.min(max, Math.floor(parsed));
}

async function handleGET(request: NextRequest) {
  try {
    const user = await requireAuthenticatedUser(request, [UserRole.ADVISER, UserRole.PANEL]);
    const userId = user.id;
    const limit = parsePositiveInteger(request.nextUrl.searchParams.get('limit'), DEFAULT_EVALUATION_LIMIT, MAX_EVALUATION_LIMIT);
    const page = parsePositiveInteger(request.nextUrl.searchParams.get('page'), 1, Number.MAX_SAFE_INTEGER);

    const evaluations = await prisma.evaluation.findMany({
      where: {
        evaluatorId: userId,
      },
      select: {
        id: true,
        score: true,
        recommendation: true,
        evaluatorId: true,
        remarks: true,
        rubricData: true,
        studentEvaluations: true,
        submittedAt: true,
        project: {
          select: {
            title: true,
            group: {
              select: {
                code: true,
                groupMembers: {
                  where: { isActive: true },
                  select: {
                    user: {
                      select: {
                        name: true
                      }
                    }
                  }
                }
              }
            },
            department: {
              select: {
                name: true
              }
            }
          }
        },
        defenseSchedule: {
          select: {
            scheduledAt: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit
    });

    const formattedEvaluations = evaluations.map(ev => {
      const students = ev.project.group?.groupMembers.map(gm => gm.user.name) || [];
      const rawRubric = ev.rubricData ? (typeof ev.rubricData === 'string' ? JSON.parse(ev.rubricData) : ev.rubricData) : [];
      const rawStudentEvaluations = ev.studentEvaluations ? (typeof ev.studentEvaluations === 'string' ? JSON.parse(ev.studentEvaluations) : ev.studentEvaluations) : [];
      return {
        id: ev.id,
        projectTitle: ev.project.title,
        groupId: ev.project.group?.code || 'No Group',
        department: ev.project.department?.name || 'IT',
        students,
        defenseDate: ev.defenseSchedule?.scheduledAt?.toISOString() || new Date().toISOString(),
        status: ev.submittedAt ? 'completed' : 'pending',
        score: ev.score,
        recommendation: ev.recommendation,
        evaluatorId: ev.evaluatorId,
        overallComments: ev.remarks || '',
        // rubricData is a plain vote object ({ vote: 'yes' | 'no' }) for panel-vote defenses rather than
        // an array of scored criteria — only expose it here when it's actually the rubric-array shape.
        rubric: Array.isArray(rawRubric) ? rawRubric : [],
        studentEvaluations: Array.isArray(rawStudentEvaluations) ? rawStudentEvaluations : [],
        submittedAt: ev.submittedAt?.toISOString() || null
      }
    });

    return NextResponse.json({ evaluations: formattedEvaluations });

  } catch (error) {
    console.error('[EVALUATIONS_GET]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

async function handlePOST(request: NextRequest) {
  try {
    const user = await requireAuthenticatedUser(request, [UserRole.ADVISER, UserRole.PANEL]);

    const data = await request.json();
    
    // Validate we have the Evaluation ID
    if (!data.id || data.id.startsWith('eval-')) {
      return NextResponse.json({ error: 'Invalid Evaluation Record. Please wait for a real assigned project.' }, { status: 400 });
    }

    const updated = await prisma.evaluation.update({
      where: { id: data.id },
      data: {
        score: data.score,
        recommendation: data.recommendation,
        remarks: data.overallComments,
        rubricData: data.rubric,
        studentEvaluations: data.studentEvaluations,
        submittedAt: new Date()
      }
    });

    return NextResponse.json({ success: true, evaluation: updated });

  } catch (error) {
    console.error('[EVALUATIONS_POST]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export const GET = withApiLogging('GET', '/api/advisers/evaluations', handleGET);
export const POST = withApiLogging('POST', '/api/advisers/evaluations', handlePOST);
