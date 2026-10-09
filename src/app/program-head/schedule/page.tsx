import { ProgramHeadShell } from '@/components/program-head/program-head-shell';
import { ProgramHeadSchedule } from '@/components/program-head/program-head-schedule';

export default function ProgramHeadSchedulePage() {
  return (
    <ProgramHeadShell
      activeNav="schedule"
      title="Defense Scheduler"
      description="Assign panels, organize defense slots, and manage room allocations."
    >
      <ProgramHeadSchedule />
    </ProgramHeadShell>
  );
}
