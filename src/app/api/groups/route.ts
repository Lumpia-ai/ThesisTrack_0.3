import { NextResponse } from 'next/server';
import { Prisma, UserRole } from '@/generated/prisma/client';
import { prisma } from '@/lib/prisma';
import { activeRoleHolders } from '@/lib/rbac/queries';
import { getServerAuthenticatedUser } from '@/lib/auth';
import { sendGroupAssignmentEmail } from '@/lib/mailer';
import { getLatestDefenseOutcomeTag, getProjectProgressSummary } from '@/lib/milestone-checkpoint-tracking';
import { withApiLogging } from '@/lib/api-logging';

const DEFAULT_GROUP_LIMIT = 100;
const MAX_GROUP_LIMIT = 200;

const groupListSelect = {
  id: true,
  userId: true,
  projectId: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  code: true,
  title: true,
  projectTitle: true,
  dept: true,
  department: true,
  members: true,
  students: true,
  progress: true,
  statusLabel: true,
  statusClass: true,
  lifecycleStatus: true,
  milestone: true,
  currentMilestone: true,
  leader: true,
  finalDefenseResult: true,
  finalManuscriptApproved: true,
  allRequiredMilestonesCompleted: true,
  completedAt: true,
  finalScore: true,
  finalRecommendation: true,
  allowMemberSubmission: true
} as const;

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

function normalizeStudentName(value: unknown) {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').toLowerCase() : '';
}

function parseStudentNames(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set<string>();
  const students: string[] = [];

  value.forEach((entry) => {
    if (typeof entry !== 'string') {
      return;
    }

    const student = entry.trim().replace(/\s+/g, ' ');
    const key = normalizeStudentName(student);
    if (!key || seen.has(key)) {
      return;
    }

    seen.add(key);
    students.push(student);
  });

  return students;
}

async function findAssignedStudents(students: string[], excludeGroupId?: string) {
  const requestedStudentKeys = new Set(students.map(normalizeStudentName).filter(Boolean));
  if (requestedStudentKeys.size === 0) {
    return [];
  }

  const groups = await prisma.group.findMany({
    where: excludeGroupId ? { id: { not: excludeGroupId } } : undefined,
    select: { students: true }
  });

  const assignedStudentKeys = new Set<string>();
  groups.forEach((group) => {
    group.students.forEach((student) => {
      const key = normalizeStudentName(student);
      if (requestedStudentKeys.has(key)) {
        assignedStudentKeys.add(key);
      }
    });
  });

  return students.filter((student) => assignedStudentKeys.has(normalizeStudentName(student)));
}

async function handleGET(request: Request) {
  try {
    const user = await getServerAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const studentName = searchParams.get('studentName');
    const requestedDepartment = searchParams.get('department');
    const fields = searchParams.get('fields');
    const limit = parsePositiveInteger(searchParams.get('limit'), DEFAULT_GROUP_LIMIT, MAX_GROUP_LIMIT);
    const page = parsePositiveInteger(searchParams.get('page'), 1, Number.MAX_SAFE_INTEGER);
    const skip = (page - 1) * limit;

    const select = fields === 'students' ? { students: true } : groupListSelect;
    const isGlobalAdmin = ['ADMIN', 'SYSTEM_ADMIN', 'RESEARCH_HEAD', 'TECH_TRANSFER', 'LIBRARY'].includes(user.role);
    
    let groups;
    if (userId) {
      groups = await prisma.group.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select
      });
    } else if (studentName) {
      groups = await prisma.group.findMany({
        where: {
          students: {
            has: studentName
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select
      });
    } else {
      // Enforce department boundary unless global admin
      const userDeptClean = user.department ? user.department.replace(/\s+(Department|Office)$/i, '').trim() : null;
      const department = isGlobalAdmin ? requestedDepartment : (userDeptClean || requestedDepartment);
      
      if (department) {
        const departmentTerms = getDepartmentSearchTerms(department);
        groups = await prisma.group.findMany({
          where: {
            OR: departmentTerms.map((term) => ({
              department: {
                contains: term,
                mode: 'insensitive'
              }
            }))
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
          select
        });
      } else {
        groups = await prisma.group.findMany({
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
          select
        });
      }
    }

    if (fields === 'students') {
      return NextResponse.json(groups);
    }

    const mappedGroups = await Promise.all(groups.map(async (group: any) => {
      const groupMembers = await prisma.groupMember.findMany({
        where: { groupId: group.id },
        include: {
          user: {
            include: {
              notifications: {
                where: {
                  title: { in: ['Group Assignment Updated', 'New Group Assignment'] },
                  status: 'UNREAD'
                }
              }
            }
          }
        }
      });

      const pendingUserNames = groupMembers
        .filter((gm) => gm.user && gm.user.notifications && gm.user.notifications.length > 0)
        .map((gm) => {
          return [gm.user.name, gm.user.displayName, [gm.user.firstName, gm.user.lastName].filter(Boolean).join(' ')].map(normalizeStudentName).filter(Boolean);
        }).flat();
      
      const pendingNamesInGroup = group.students.filter((studentName: string) => {
         return pendingUserNames.includes(normalizeStudentName(studentName));
      });

      const [defenseOutcomeTag, progressSummary] = await Promise.all([
        getLatestDefenseOutcomeTag(prisma, group.projectId),
        getProjectProgressSummary(prisma, group.projectId)
      ]);

      return {
        ...group,
        progress: progressSummary.percent,
        progressDetail: `${progressSummary.completedCheckpoints} of ${progressSummary.totalCheckpoints} checkpoints complete`,
        progressStage: progressSummary.currentStageTitle,
        pendingStudents: pendingNamesInGroup,
        defenseOutcomeTag
      };
    }));

    return NextResponse.json(mappedGroups);
  } catch (error) {
    console.error('Error fetching groups:', error);
    return NextResponse.json({ error: 'Failed to fetch groups' }, { status: 500 });
  }
}

async function handlePOST(request: Request) {
  try {
    const authUser = await getServerAuthenticatedUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (authUser.role !== 'ADVISER' && !GROUP_WRITE_ELEVATED_ROLES.has(authUser.role)) {
      return NextResponse.json({ error: 'You do not have permission to create groups.' }, { status: 403 });
    }

    const body = await request.json();
    const {
      code,
      title,
      projectTitle,
      dept,
      department,
      students,
      leader,
      statusLabel,
      statusClass,
      projectId
    } = body;
    // An adviser always owns the groups they create; only elevated roles may create one on an adviser's behalf.
    const userId = GROUP_WRITE_ELEVATED_ROLES.has(authUser.role) && typeof body.userId === 'string' && body.userId
      ? body.userId
      : authUser.id;

    const parsedStudents = parseStudentNames(students);
    if (parsedStudents.length === 0) {
      return NextResponse.json({ error: 'Select at least one student before creating a group.' }, { status: 400 });
    }

    const assignedStudents = await findAssignedStudents(parsedStudents);
    if (assignedStudents.length > 0) {
      return NextResponse.json(
        { error: 'One or more selected students already belong to a group.', students: assignedStudents },
        { status: 409 }
      );
    }

    const matchedUsers = await prisma.user.findMany({
      where: {
        ...activeRoleHolders([UserRole.STUDENT]),
        groupMemberships: { none: {} }
      },
      select: { id: true, name: true, displayName: true, firstName: true, lastName: true, yearLevel: true, email: true }
    });

    const membersToCreate: any[] = [];
    const verifiedUsers: any[] = [];
    for (const studentName of parsedStudents) {
      const normalizedQuery = normalizeStudentName(studentName);
      const matchedUser = matchedUsers.find(u => {
        const candidateNames = [
          u.name,
          u.displayName,
          [u.firstName, u.lastName].filter(Boolean).join(' ')
        ].map(normalizeStudentName).filter(Boolean);
        return candidateNames.includes(normalizedQuery);
      });

      if (matchedUser) {
        verifiedUsers.push(matchedUser);
        membersToCreate.push({
          userId: matchedUser.id,
          isActive: true,
          role: normalizeStudentName(leader) === normalizedQuery ? 'LEADER' : 'MEMBER'
        });
      }
    }

    // TEMPORARILY DISABLED: Strict Year-Level Grouping Validation
    // if (verifiedUsers.length > 0) {
    //   const firstYearLevel = verifiedUsers[0].yearLevel;
    //   const mismatchedStudent = verifiedUsers.find(u => u.yearLevel !== firstYearLevel);
    //   if (mismatchedStudent) {
    //     return NextResponse.json({ 
    //       error: `Notice: ${mismatchedStudent.name} cannot be added because all members must be in the same year level.` 
    //     }, { status: 400 });
    //   }
    // }

    const newGroup = await prisma.group.create({
      data: {
        userId,
        code,
        title,
        projectTitle,
        dept,
        department,
        students: parsedStudents,
        members: parsedStudents.length,
        leader,
        statusLabel,
        statusClass,
        projectId,
        ...(membersToCreate.length > 0 && {
          groupMembers: {
            create: membersToCreate
          }
        })
      }
    });

    if (verifiedUsers.length > 0) {
      const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const loginUrl = `${origin}/login`;

      let adviserName = 'an adviser';
      if (userId) {
        const adviser = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, displayName: true } });
        if (adviser) adviserName = adviser.displayName || adviser.name || 'an adviser';
      }

      await prisma.notification.createMany({
        data: verifiedUsers.map((u) => {
          const role = membersToCreate.find(m => m.userId === u.id)?.role === 'LEADER' ? 'the Group Leader' : 'a Member';
          return {
            userId: u.id,
            title: 'New Group Assignment',
            message: `You have been assigned to group ${code || 'Unknown'} as ${role} by ${adviserName}.`,
            type: 'info'
          };
        })
      });

      for (const user of verifiedUsers) {
        if (user.email) {
          const role = membersToCreate.find(m => m.userId === user.id)?.role === 'LEADER' ? 'Group Leader' : 'Group Member';
          await sendGroupAssignmentEmail({
            to: user.email,
            name: user.displayName || user.name,
            adviserName: adviserName !== 'an adviser' ? adviserName : null,
            groupCode: code,
            projectTitle: title || projectTitle,
            role,
            loginUrl
          }).catch(err => console.error('Failed to send group assignment email to', user.email, err));
        }
      }
    }
    
    return NextResponse.json(newGroup, { status: 201 });
  } catch (error: any) {
    // A collided group code is a routine, expected outcome of manual entry (not
    // a real server error) — surface it as a clean 409 with a specific message
    // instead of the raw Prisma constraint error the client would otherwise see.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const target = Array.isArray(error.meta?.target) ? error.meta.target.map((value) => String(value)) : [];
      if (target.includes('code')) {
        return NextResponse.json(
          { error: 'This group code is already in use. Choose a different code.' },
          { status: 409 }
        );
      }
    }

    console.error('Error creating group:', error);
    return NextResponse.json({ error: 'Failed to create group', details: error.message }, { status: 500 });
  }
}

const GROUP_WRITE_ELEVATED_ROLES = new Set(['PROGRAM_HEAD', 'RESEARCH_HEAD', 'ADMIN', 'SYSTEM_ADMIN']);

async function handlePUT(request: Request) {
  try {
    const authUser = await getServerAuthenticatedUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, students } = body;

    if (!id) {
      return NextResponse.json({ error: 'Missing group id' }, { status: 400 });
    }

    const existingGroupBeforeUpdate = await prisma.group.findUnique({
      where: { id },
      include: {
        groupMembers: {
          include: {
            user: true
          }
        }
      }
    });

    if (!existingGroupBeforeUpdate) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    const isOwningAdviser = existingGroupBeforeUpdate.userId === authUser.id;
    if (!isOwningAdviser && !GROUP_WRITE_ELEVATED_ROLES.has(authUser.role)) {
      return NextResponse.json({ error: 'You do not have permission to update this group.' }, { status: 403 });
    }

    const updateData: {
      students?: string[];
      members?: number;
      title?: string;
      projectTitle?: string;
      allowMemberSubmission?: boolean;
      leader?: string;
      status?: string;
      statusLabel?: string;
      statusClass?: string;
      milestone?: string;
      currentMilestone?: string;
    } = {};
    if (body.leader !== undefined) {
      updateData.leader = body.leader;
    }
    if (Object.prototype.hasOwnProperty.call(body, 'students')) {
      const parsedStudents = parseStudentNames(students);
      const assignedStudents = await findAssignedStudents(parsedStudents, id);

      if (assignedStudents.length > 0) {
        return NextResponse.json(
          { error: 'One or more selected students already belong to a group.', students: assignedStudents },
          { status: 409 }
        );
      }

      updateData.students = parsedStudents;
      updateData.members = parsedStudents.length;
    }
    if (body.title !== undefined) {
      updateData.title = body.title;
    }
    if (body.projectTitle !== undefined) {
      updateData.projectTitle = body.projectTitle;
    }
    if (body.status !== undefined) {
      updateData.status = body.status;
    }
    if (body.statusLabel !== undefined) {
      updateData.statusLabel = body.statusLabel;
    }
    if (body.statusClass !== undefined) {
      updateData.statusClass = body.statusClass;
    }
    if (body.milestone !== undefined) {
      updateData.milestone = body.milestone;
    }
    if (body.currentMilestone !== undefined) {
      updateData.currentMilestone = body.currentMilestone;
    }
    if (body.allowMemberSubmission !== undefined) {
      updateData.allowMemberSubmission = body.allowMemberSubmission;
    }

    if (updateData.students) {
      const existingGroup = await prisma.group.findUnique({
        where: { id },
        select: { leader: true }
      });

      const matchedUsers = await prisma.user.findMany({
        where: {
          ...activeRoleHolders([UserRole.STUDENT]),
          groupMemberships: { none: { groupId: { not: id } } }
        },
        select: { id: true, name: true, displayName: true, firstName: true, lastName: true, yearLevel: true, email: true }
      });

      const leaderQuery = normalizeStudentName(updateData.leader || body.leader || existingGroup?.leader || '');
      
      const verifiedUsers: any[] = [];
      const newMembers = updateData.students.map(studentName => {
        const normalizedQuery = normalizeStudentName(studentName);
        const matchedUser = matchedUsers.find(u => {
          const candidateNames = [
            u.name,
            u.displayName,
            [u.firstName, u.lastName].filter(Boolean).join(' ')
          ].map(normalizeStudentName).filter(Boolean);
          return candidateNames.includes(normalizedQuery);
        });

        if (matchedUser) {
          verifiedUsers.push(matchedUser);
          return {
            userId: matchedUser.id,
            isActive: true,
            role: leaderQuery === normalizedQuery ? 'LEADER' : 'MEMBER'
          };
        }
        return null;
      }).filter(Boolean) as any[];

      // TEMPORARILY DISABLED: Strict Year-Level Grouping Validation
      // if (verifiedUsers.length > 0) {
      //   const firstYearLevel = verifiedUsers[0].yearLevel;
      //   const mismatchedStudent = verifiedUsers.find(u => u.yearLevel !== firstYearLevel);
      //   if (mismatchedStudent) {
      //     return NextResponse.json({ 
      //       error: `Notice: ${mismatchedStudent.name} cannot be added because all members must be in the same year level.` 
      //     }, { status: 400 });
      //   }
      // }

      const previousGroupMembers = await prisma.groupMember.findMany({
        where: { groupId: id },
        select: { userId: true }
      });
      const previousUserIds = new Set(previousGroupMembers.map(gm => gm.userId));

      const updatedGroup = await prisma.$transaction(async (tx) => {
        await tx.groupMember.deleteMany({ where: { groupId: id } });
        
        return tx.group.update({
          where: { id },
          data: {
            ...updateData,
            ...(newMembers.length > 0 && {
              groupMembers: {
                create: newMembers
              }
            })
          }
        });
      });

      if (verifiedUsers.length > 0) {
        const newlyAddedUsers = verifiedUsers.filter(u => !previousUserIds.has(u.id));

        if (newlyAddedUsers.length > 0) {
          const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
          const loginUrl = `${origin}/login`;

          let adviserName = 'an adviser';
          if (updatedGroup.userId) {
            const adviser = await prisma.user.findUnique({ where: { id: updatedGroup.userId }, select: { name: true, displayName: true } });
            if (adviser) adviserName = adviser.displayName || adviser.name || 'an adviser';
          }

          await prisma.notification.createMany({
            data: newlyAddedUsers.map((u) => {
              const role = newMembers.find(m => m?.userId === u.id)?.role === 'LEADER' ? 'the Group Leader' : 'a Member';
              return {
                userId: u.id,
                title: 'Group Assignment Updated',
                message: `You are now assigned to group ${updatedGroup.code || 'Unknown'} as ${role} under ${adviserName}.`,
                type: 'info'
              };
            })
          });

          for (const user of newlyAddedUsers) {
            if (user.email) {
              const role = newMembers.find(m => m?.userId === user.id)?.role === 'LEADER' ? 'Group Leader' : 'Group Member';
              await sendGroupAssignmentEmail({
                to: user.email,
                name: user.displayName || user.name,
                adviserName: adviserName !== 'an adviser' ? adviserName : null,
                groupCode: updatedGroup.code,
                projectTitle: updatedGroup.title || updatedGroup.projectTitle,
                role,
                loginUrl
              }).catch(err => console.error('Failed to send group assignment email to', user.email, err));
            }
          }
        }
      }

      return NextResponse.json(updatedGroup);
    }

    const updatedGroup = await prisma.group.update({
      where: { id },
      data: updateData
    });

    if (body.leader && !updateData.students) {
      // Find the new leader user
      const leaderQuery = normalizeStudentName(body.leader);
      const groupUsers = await prisma.user.findMany({
        where: {
          role: 'STUDENT',
          groupMemberships: { some: { groupId: id } }
        }
      });

      const matchedUser = groupUsers.find(u => {
        const candidateNames = [
          u.name,
          u.displayName,
          [u.firstName, u.lastName].filter(Boolean).join(' ')
        ].map(normalizeStudentName).filter(Boolean);
        return candidateNames.includes(leaderQuery);
      });
      
      // Update their role in GroupMember
      if (matchedUser) {
        await prisma.groupMember.updateMany({
          where: { groupId: id },
          data: { role: 'MEMBER' }
        });
        await prisma.groupMember.updateMany({
          where: { groupId: id, userId: matchedUser.id },
          data: { role: 'LEADER' }
        });

        const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const loginUrl = `${origin}/login`;

        let adviserName = 'an adviser';
        if (updatedGroup.userId) {
          const adviser = await prisma.user.findUnique({ where: { id: updatedGroup.userId }, select: { name: true, displayName: true } });
          if (adviser) adviserName = adviser.displayName || adviser.name || 'an adviser';
        }

        await prisma.notification.create({
          data: {
            userId: matchedUser.id,
            title: 'Group Leadership Assigned',
            message: `You have been designated as the Group Leader for ${updatedGroup.code || 'Unknown'} by ${adviserName}.`,
            type: 'info'
          }
        });
        
        if (matchedUser.email) {
          await sendGroupAssignmentEmail({
            to: matchedUser.email,
            name: matchedUser.displayName || matchedUser.name,
            adviserName: adviserName !== 'an adviser' ? adviserName : null,
            groupCode: updatedGroup.code,
            projectTitle: updatedGroup.title || updatedGroup.projectTitle,
            role: 'Group Leader',
            loginUrl
          }).catch(err => console.error('Failed to send group assignment email to', matchedUser.email, err));
        }
      }
    }
    
    // Check if the group was demoted (from active to pending)
    if (
      existingGroupBeforeUpdate.status === 'active' &&
      updateData.status === 'pending'
    ) {
      const notifications = [];
      const title = 'Project Milestone Reset';
      const message = `The project for group ${updatedGroup.code} has been rejected in Stage 2. The milestone has been reset, and a new title proposal is required.`;
      
      // Notify Adviser
      if (existingGroupBeforeUpdate.userId) {
        notifications.push({
          userId: existingGroupBeforeUpdate.userId,
          title,
          message,
          type: 'warning'
        });
      }
      
      // Notify Students
      for (const member of existingGroupBeforeUpdate.groupMembers) {
        if (member.userId) {
          notifications.push({
            userId: member.userId,
            title,
            message,
            type: 'warning'
          });
        }
      }
      
      if (notifications.length > 0) {
        await prisma.notification.createMany({
          data: notifications
        });
      }
    }

    return NextResponse.json(updatedGroup);
  } catch (error) {
    console.error('Error updating group:', error);
    return NextResponse.json({ error: 'Failed to update group' }, { status: 500 });
  }
}

export const GET = withApiLogging('GET', '/api/groups', handleGET);
export const POST = withApiLogging('POST', '/api/groups', handlePOST);
export const PUT = withApiLogging('PUT', '/api/groups', handlePUT);
