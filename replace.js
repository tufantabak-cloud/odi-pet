const fs = require('fs');
const file = 'c:/Odi.Pet/src/app/owner/pets/[id]/PetDetailClient.tsx';
let content = fs.readFileSync(file, 'utf8');

const renderFn = `  const renderTasksSection = (tasksList: any[], title: string) => {
    if (!tasksList || tasksList.length === 0) return null;
    return (
      <div className="flex flex-col gap-3 mt-4">
        <h4 className="text-[11px] font-black text-text-secondary uppercase tracking-widest px-1">{title}</h4>
        {tasksList.map((item: any) => {
          const isDone = item.status === 'done';
          return (
            <div key={item.id} className={\`flex items-center justify-between p-4 rounded-[20px] shadow-sm \${isDone ? 'bg-gray-50/50 opacity-80' : 'bg-[#edf7f6]'}\`}>
              <div className="flex items-center gap-3">
                <div className={\`w-10 h-10 rounded-full flex items-center justify-center shrink-0 \${isDone ? 'bg-gray-200 grayscale' : 'bg-[#cdeee9]'}\`}>{renderSvgIcon(item)}</div>
                <div>
                  <p className={\`font-extrabold text-[14px] leading-tight \${isDone ? 'text-gray-500 line-through' : 'text-[#0f3a35]'}\`}>{item.title || item.vaccines?.name || 'Görev'}</p>
                  <p className={\`text-[11px] font-semibold mt-0.5 \${isDone ? 'text-gray-400' : 'text-[#5a8680]'}\`}>{formatTaskDate(item.due_date)}</p>
                </div>
              </div>
              <div className="relative">
                <button 
                  onClick={(e) => {
                    e.stopPropagation()
                    setActiveMenuId(prev => prev === item.id ? null : item.id)
                  }}
                  className="text-[#3c6b65] hover:text-[#0f3a35] p-2 transition-colors focus:outline-none cursor-pointer"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="1" />
                    <circle cx="12" cy="5" r="1" />
                    <circle cx="12" cy="19" r="1" />
                  </svg>
                </button>

                {/* Interactive Dropdown Menu */}
                {activeMenuId === item.id && (
                  <div className="absolute right-0 top-full mt-1 w-52 bg-white rounded-2xl shadow-xl border border-border-main/50 py-2 z-[200] animate-scaleIn">
                    {!isDone && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleMarkCompleted(item.id); }}
                        className="w-full text-left px-4 py-2.5 text-[12px] font-bold text-success hover:bg-success/5 transition-colors flex items-center gap-2 cursor-pointer"
                      >
                        <span>✓</span> Tamamlandı İşaretle
                      </button>
                    )}
                    {!isDone && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handlePostpone(item.id); }}
                        className="w-full text-left px-4 py-2.5 text-[12px] font-bold text-[#0f3a35] hover:bg-[#edf7f6] transition-colors flex items-center gap-2 cursor-pointer"
                      >
                        <span>📅</span> 1 Gün Ertele
                      </button>
                    )}
                    {!isDone && <div className="border-t border-border-main/30 mx-2 my-1" />}
                    <button
                      onClick={(e) => { e.stopPropagation(); setTaskToEdit(item); setActiveMenuId(null); setTaskWizardOpen(true); }}
                      className="w-full text-left px-4 py-2.5 text-[12px] font-bold text-primary hover:bg-primary/5 transition-colors flex items-center gap-2 cursor-pointer"
                    >
                      <span>✏️</span> Düzenle
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteTask(item.id); }}
                      className="w-full text-left px-4 py-2.5 text-[12px] font-bold text-error hover:bg-error/5 transition-colors flex items-center gap-2 cursor-pointer"
                    >
                      <span>❌</span> Sil
                    </button>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  return (\n`;

content = content.replace('  return (\n', renderFn);

const regex = /\{\/\* Planned Tasks \*\/\}[\s\S]*?tasks\.length > 0 && \([\s\S]*?<\/[dD][iI][vV]>\s*\)\}/g;
content = content.replace(regex, `{/* Planned Tasks */}
          {renderTasksSection(tasks.filter((t: any) => t.status !== 'done'), 'Planlanmış Görevler')}
          {renderTasksSection(tasks.filter((t: any) => t.status === 'done'), 'Tamamlanan Görevler')}`);

fs.writeFileSync(file, content);
console.log('done!');
