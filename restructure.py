import re

def main():
    path = 'src/app/owner/pets/[id]/PetDetailClient.tsx'
    with open(path, 'r', encoding='utf-8') as f:
        text = f.read()

    # 1. Add activeTab state
    state_str = "  const [activeTab, setActiveTab] = useState<'ozet'|'saglik'|'bakim'|'takvim'|'ekstra'>('ozet')"
    if "const [activeTab, setActiveTab]" not in text:
        text = re.sub(
            r'(const \[openSections, setOpenSections\] = useState<Set<string>>\([^)]+\)\s*)',
            r'\1  ' + state_str + '\n',
            text,
            count=1
        )

    # 2. Extract HumanAgeCalculator
    hac_regex = r'(\{\s*/\*\s*10\. HumanAgeCalculator\s*\*/\s*\}.*?<HumanAgeCalculator[^>]+/>)'
    hac_match = re.search(hac_regex, text, re.DOTALL)
    hac_block = ""
    if hac_match:
        hac_block = hac_match.group(1)
        # remove it from its original place
        text = text.replace(hac_block, '')

    # 3. Add Tab Bar and open Özet after PetHeroCard
    paylas_sos_block = """
                {/* Paylaş + Acil Durum */}
                <div className="flex gap-2 w-full mt-2">
                  <Link
                    href={`/owner/pets/${pet.id}/share`}
                    className="flex-1 h-9 rounded-xl bg-bg-main border border-border-main flex items-center justify-center gap-1.5 text-[12px] font-bold text-text-secondary hover:border-primary/30 hover:text-primary transition-colors"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                    </svg>
                    Paylaş
                  </Link>
                  <div className="flex-1">
                    <FloatingSOS
                      petId={pet.id}
                      petName={pet.name}
                      vetPhone={pet.vet_phone}
                      vetName={pet.vet_name}
                      sosContacts={pet.sos_contacts}
                      fullWidth={true}
                      onLostReport={activeLostReport ? undefined : () => setLostWizardOpen(true)}
                      onMarkFound={activeLostReport ? handleMarkFound : undefined}
                    />
                  </div>
                </div>
"""

    tab_bar_str = """
            <div className="sticky top-0 z-20 bg-surface border-b border-border -mx-4 px-4 sm:mx-0 sm:px-0">
              <div className="flex overflow-x-auto scrollbar-hide [&::-webkit-scrollbar]:hidden">
                {[
                  {id:'ozet', label:'Özet'},
                  {id:'saglik', label:'Sağlık'},
                  {id:'bakim', label:'Bakım'},
                  {id:'takvim', label:'Takvim'},
                  {id:'ekstra', label:'Ekstra'},
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex-shrink-0 px-4 py-2.5 text-[12px] font-medium whitespace-nowrap border-b-2 transition-colors ${activeTab === tab.id ? 'border-primary text-primary' : 'border-transparent text-text-secondary'}`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {activeTab === 'ozet' && (
              <div className="flex flex-col gap-5">
"""
    hero_end_regex = r'(<PetHeroCard[^>]+/>)'
    text = re.sub(hero_end_regex, r'\1\n' + tab_bar_str, text, count=1)

    timeline_start_regex = r'(\{\s*/\*\s*6\. Görevler & Ajanda \(Weekly Timeline Strip\)\s*\*/\s*\})'
    close_ozet_open_takvim = (
        hac_block + "\n" + paylas_sos_block + "\n" +
        "              </div>\n            )}\n\n" +
        "            {activeTab === 'takvim' && (\n" +
        "              <div className=\"flex flex-col gap-5\">\n"
    )
    text = re.sub(timeline_start_regex, close_ozet_open_takvim + r'\1', text, count=1)

    estrus_start_regex = r'(\{\s*/\*\s*8\. EstrusTracker \(Sadece Kısırlaştırılmamış Dişi Kediler\)\s*\*/\s*\})'
    close_takvim_open_ekstra = (
        "              </div>\n            )}\n\n" +
        "            {activeTab === 'ekstra' && (\n" +
        "              <div className=\"flex flex-col gap-5\">\n"
    )
    text = re.sub(estrus_start_regex, close_takvim_open_ekstra + r'\1', text, count=1)

    mgc_start_regex = r'(\{\s*/\*\s*9\. MinimalGrowthChart \(Sadece Yavru & Kilo Verisi Varsa\)\s*\*/\s*\})'
    close_ekstra_open_saglik = (
        "              </div>\n            )}\n\n" +
        "            {activeTab === 'saglik' && (\n" +
        "              <div className=\"flex flex-col gap-5\">\n"
    )
    text = re.sub(mgc_start_regex, close_ekstra_open_saglik + r'\1', text, count=1)

    map_start_regex = r'(sections\.map\(\(section, idx\) => \{)'
    smart_map_replace = (
        "              </div>\n            )}\n\n" +
        "            {['saglik', 'bakim'].includes(activeTab) && sections.filter(s => activeTab === 'saglik' ? ['Aşı', 'Parazit', 'Beslenme', 'Sağlık', 'Veteriner'].includes(s.name) : activeTab === 'bakim' ? ['Bakım', 'Hijyen', 'Aktivite', 'Diğer'].includes(s.name) : false).map((section, idx) => {\n"
    )
    text = re.sub(map_start_regex, smart_map_replace, text, count=1)

    grid_start_regex = r'(\{\s*/\*\s*Ekstra Bilgiler ve Araçlar.*?\*/\s*\})'
    grid_wrap = (
        "            {activeTab === 'ekstra' && (\n" +
        "              <div className=\"flex flex-col gap-5 mt-4\">\n"
    )
    text = re.sub(grid_start_regex, grid_wrap + r'\1', text, count=1)
    
    end_return_regex = r'(</div>\s*);\s*\}\)\(\)\}'
    text = re.sub(end_return_regex, r'</div>\n            )}\n            \1', text, count=1)

    with open(path, 'w', encoding='utf-8') as f:
        f.write(text)
    print("DONE")

if __name__ == '__main__':
    main()
