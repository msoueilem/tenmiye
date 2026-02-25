import React from 'react';
import { Team } from '@/lib/firebase/queries';

export function TeamHierarchy({ data }: { data: { teams: Team[] } }) {
  if (!data || !data.teams || data.teams.length === 0) return null;

  return (
    <div className="flex flex-col gap-10 rounded-2xl border border-slate-100 bg-white px-4 py-10 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="mx-auto flex max-w-3xl flex-col gap-4 text-center">
        <h2 className="text-3xl font-bold text-slate-900 dark:text-white">
          الهيكل التنظيمي
        </h2>
        <p className="text-slate-600 dark:text-slate-400">
          فريق عمل متفانٍ يقود المجموعة نحو تحقيق أهدافها السامية
        </p>
      </div>

      <div className="mx-auto mt-4 flex w-full max-w-5xl flex-col items-center gap-8">
        {data.teams.map((team, teamIndex) => (
          <React.Fragment key={teamIndex}>
            {/* Team Head */}
            <div className="flex w-full flex-row items-center rounded-xl border border-slate-100 bg-white p-4 shadow-md transition-shadow duration-300 hover:shadow-lg md:w-[480px] dark:border-slate-800 dark:bg-slate-900">
              <div className="flex-1 pl-4 text-right">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  {team.head.name}
                </h3>
                <p className="text-primary mb-1 text-base font-medium">
                  {team.head.title}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {team.team_name}
                </p>
              </div>
              <div className="border-primary/20 flex h-24 w-24 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg border-2 bg-slate-100 dark:bg-slate-800">
                {team.head.photo ? (
                  <div
                    className="h-full w-full bg-cover bg-center"
                    style={{ backgroundImage: `url("${team.head.photo}")` }}
                    title={team.head.name}
                  ></div>
                ) : (
                  <span className="material-symbols-outlined text-4xl text-slate-400">
                    person
                  </span>
                )}
              </div>
            </div>

            {/* Connecting Lines */}
            {team.members && team.members.length > 0 && (
              <>
                <div className="h-8 w-px bg-slate-300 dark:bg-slate-600"></div>
                <div className="relative hidden h-px w-full max-w-3xl bg-slate-300 md:block dark:bg-slate-600">
                  <div className="absolute -top-2 left-1/2 h-4 w-px -translate-x-1/2 bg-slate-300 dark:bg-slate-600"></div>
                  {team.members.map((_, idx) => {
                    const memberCount = team.members.length;
                    const leftPos = ((idx + 0.5) / memberCount) * 100;
                    return (
                      <div
                        key={idx}
                        className="absolute top-0 h-8 w-px bg-slate-300 dark:bg-slate-600"
                        style={{ left: `${leftPos}%` }}
                      ></div>
                    );
                  })}
                </div>

                {/* Team Members */}
                <div
                  className={`grid grid-cols-1 md:grid-cols-${Math.min(team.members.length, 3)} mt-8 w-full gap-6 md:mt-0`}
                >
                  {team.members.map((member, idx) => (
                    <div
                      key={idx}
                      className="flex w-full flex-row items-center rounded-xl border border-slate-100 bg-white p-4 shadow-md transition-shadow duration-300 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900"
                    >
                      <div className="flex-1 pl-3 text-right">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                          {member.name}
                        </h3>
                        <p className="text-primary/90 mb-1 text-sm font-medium">
                          {member.title}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {team.team_name}
                        </p>
                      </div>
                      <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800">
                        {member.photo ? (
                          <div
                            className="h-full w-full bg-cover bg-center"
                            style={{
                              backgroundImage: `url("${member.photo}")`,
                            }}
                            title={member.name}
                          ></div>
                        ) : (
                          <span className="material-symbols-outlined text-3xl text-slate-400">
                            person
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
            {/* Spacing if multiple teams */}
            {teamIndex < data.teams.length - 1 && <div className="h-16"></div>}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
