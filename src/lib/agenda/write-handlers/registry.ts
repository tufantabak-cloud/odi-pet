import { AgendaWriteHandler } from './types';
import { VaccineWriteHandler } from './handlers/vaccine-write-handler';
import { ParasiteWriteHandler } from './handlers/parasite-write-handler';
import { RoutineWriteHandler } from './handlers/routine-write-handler';
import { GrowthWriteHandler } from './handlers/growth-write-handler';
import { MedicationWriteHandler } from './handlers/medication-write-handler';
import { GenericWriteHandler } from './handlers/generic-write-handler';

export class AgendaWriteRegistry {
  private vaccineHandler = new VaccineWriteHandler();
  private parasiteHandler = new ParasiteWriteHandler();
  private growthHandler = new GrowthWriteHandler();
  private medicationHandler = new MedicationWriteHandler();
  private genericHandler = new GenericWriteHandler();

  getHandler(category: string): AgendaWriteHandler<any> {
    const cat = (category || '').toLowerCase().trim();

    if (cat === 'asi') return this.vaccineHandler;
    if (cat === 'parazit') return this.parasiteHandler;
    if (cat === 'saglik' || cat === 'kilo') return this.growthHandler;
    if (cat === 'ilac') return this.medicationHandler;
    if (['bakim', 'hijyen', 'beslenme', 'aktivite'].includes(cat)) {
      return new RoutineWriteHandler(cat);
    }
    return this.genericHandler;
  }
}

export const agendaWriteRegistry = new AgendaWriteRegistry();
