import React, { useRef, useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Users,
  UserPlus,
  CalendarCheck2,
  CalendarDays,
  AlertTriangle,
  Mail,
  Link2,
  Settings,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { TrainerTab } from '../types';

interface NavigationTabBarProps {
  activeTab: TrainerTab;
  onTabChange: (tab: TrainerTab) => void;
  counts: {
    allStudents: number;
    ongoing: number;
    demos: number;
    attendanceToday: number;
    irregular: number;
    pendingAttendance: number;
  };
}

export const NavigationTabBar: React.FC<NavigationTabBarProps> = ({
  activeTab,
  onTabChange,
  counts
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const tabs = [
    {
      id: 'dashboard' as TrainerTab,
      label: 'Dashboard',
      icon: LayoutDashboard,
      badge: counts.pendingAttendance > 0 ? `${counts.pendingAttendance} alerts` : undefined,
      badgeVariant: 'warning'
    },
    {
      id: 'student_details' as TrainerTab,
      label: 'Student Details',
      icon: Users,
      badge: `${counts.allStudents}`,
      badgeVariant: 'neutral'
    },
    {
      id: 'demo_management' as TrainerTab,
      label: 'Demo Management',
      icon: UserPlus,
      badge: `${counts.demos}`,
      badgeVariant: 'neutral'
    },
    {
      id: 'attendance_tracking' as TrainerTab,
      label: 'Attendance Tracking',
      icon: CalendarCheck2,
      badge: `${counts.attendanceToday} today`,
      badgeVariant: 'success'
    },
    {
      id: 'class_schedule' as TrainerTab,
      label: 'Class Schedule',
      icon: CalendarDays,
      badge: `${counts.ongoing}`,
      badgeVariant: 'neutral'
    },
    {
      id: 'irregular_students' as TrainerTab,
      label: 'Irregular Students',
      icon: AlertTriangle,
      badge: counts.irregular > 0 ? `${counts.irregular}` : undefined,
      badgeVariant: 'danger'
    },
    {
      id: 'class_links' as TrainerTab,
      label: 'Daily Class Link',
      icon: Link2,
      badge: 'Live',
      badgeVariant: 'info'
    },
    {
      id: 'completion_template' as TrainerTab,
      label: 'Completion Mail Template',
      icon: Mail,
      badge: undefined,
      badgeVariant: 'neutral'
    },
    {
      id: 'settings' as TrainerTab,
      label: 'Trainer Settings',
      icon: Settings,
      badge: undefined,
      badgeVariant: 'neutral'
    }
  ];

  const checkScrollability = () => {
    if (!scrollContainerRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
    setCanScrollLeft(scrollLeft > 4);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 4);
  };

  useEffect(() => {
    checkScrollability();
    window.addEventListener('resize', checkScrollability);
    return () => window.removeEventListener('resize', checkScrollability);
  }, []);

  const handleScroll = (direction: 'left' | 'right') => {
    if (!scrollContainerRef.current) return;
    const amount = direction === 'left' ? -260 : 260;
    scrollContainerRef.current.scrollBy({ left: amount, behavior: 'smooth' });
    setTimeout(checkScrollability, 300);
  };

  return (
    <div className="bg-white border-b border-[#d9e0e7] shadow-xs px-2 sm:px-4 lg:px-8 relative">
      <div className="max-w-7xl mx-auto flex items-center relative group">
        {/* Left Scroll Button */}
        <button
          type="button"
          onClick={() => handleScroll('left')}
          disabled={!canScrollLeft}
          title="Scroll Left"
          className={`shrink-0 z-10 w-7 h-7 rounded-full bg-white shadow-md border border-slate-300 flex items-center justify-center text-slate-700 transition-all mr-1.5 cursor-pointer ${
            canScrollLeft
              ? 'hover:bg-slate-100 hover:text-[#0a6ed1] opacity-100'
              : 'opacity-30 cursor-not-allowed text-slate-400'
          }`}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Scrollable Tabs Container */}
        <div
          ref={scrollContainerRef}
          onScroll={checkScrollability}
          className="flex-1 overflow-x-auto scroll-smooth py-2.5 scrollbar-thin scrollbar-thumb-slate-300 hover:scrollbar-thumb-slate-400 scrollbar-track-slate-100"
          style={{ scrollbarWidth: 'thin' }}
        >
          <nav className="flex space-x-1.5 sm:space-x-2 min-w-max px-1">
            {tabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={`flex items-center px-3.5 py-2 rounded-md text-xs sm:text-sm font-medium transition-all relative shrink-0 cursor-pointer ${
                    isActive
                      ? 'bg-[#eaf3fc] text-[#0a6ed1] font-semibold border-b-2 border-[#0a6ed1] shadow-2xs'
                      : 'text-[#475569] hover:bg-[#f1f5f9] hover:text-[#1e293b]'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 mr-2 transition-colors ${
                      isActive ? 'text-[#0a6ed1]' : 'text-slate-500'
                    }`}
                  />
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span
                      className={`ml-2 text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                        tab.badgeVariant === 'danger'
                          ? 'bg-rose-100 text-rose-700 border border-rose-300'
                          : tab.badgeVariant === 'warning'
                          ? 'bg-amber-100 text-amber-800 border border-amber-300 animate-pulse'
                          : tab.badgeVariant === 'success'
                          ? 'bg-emerald-100 text-emerald-800'
                          : tab.badgeVariant === 'info'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Right Scroll Button */}
        <button
          type="button"
          onClick={() => handleScroll('right')}
          disabled={!canScrollRight}
          title="Scroll Right"
          className={`shrink-0 z-10 w-7 h-7 rounded-full bg-white shadow-md border border-slate-300 flex items-center justify-center text-slate-700 transition-all ml-1.5 cursor-pointer ${
            canScrollRight
              ? 'hover:bg-slate-100 hover:text-[#0a6ed1] opacity-100'
              : 'opacity-30 cursor-not-allowed text-slate-400'
          }`}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
