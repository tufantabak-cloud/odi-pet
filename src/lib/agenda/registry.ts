import { AgendaReadHandler } from './types';
import { VaccineReadHandler } from './handlers/vaccine-handler';
import { ParasiteReadHandler } from './handlers/parasite-handler';
import { RoutineReadHandler } from './handlers/routine-handler';
import { MedicationReadHandler } from './handlers/medication-handler';
import { GrowthMeasurementReadHandler } from './handlers/growth-handler';
import { AppointmentReadHandler } from './handlers/appointment-handler';
import { NutritionLogReadHandler } from './handlers/nutrition-handler';
import { GenericReadHandler } from './handlers/generic-handler';

export class AgendaReadRegistry {
  private handlers = new Map<string, AgendaReadHandler>();
  private genericHandler = new GenericReadHandler();
  private vaccineHandler = new VaccineReadHandler();
  private parasiteHandler = new ParasiteReadHandler();
  private medicationHandler = new MedicationReadHandler();
  private growthHandler = new GrowthMeasurementReadHandler();
  private appointmentHandler = new AppointmentReadHandler();
  private nutritionHandler = new NutritionLogReadHandler();

  constructor() {
    this.handlers.set('asi', this.vaccineHandler);
    this.handlers.set('parazit', this.parasiteHandler);
    this.handlers.set('ilac', this.medicationHandler);
    this.handlers.set('bakim', new RoutineReadHandler('bakim'));
    this.handlers.set('hijyen', new RoutineReadHandler('hijyen'));
    this.handlers.set('beslenme', new RoutineReadHandler('beslenme'));
    this.handlers.set('aktivite', new RoutineReadHandler('aktivite'));
  }

  getHandlerForRecord(source: string, category?: string, subType?: string, extraData?: any): AgendaReadHandler {
    // 1. Source-specific routing precedence
    if (source === 'vaccine_records_v2') return this.vaccineHandler;
    if (source === 'parasite_records') return this.parasiteHandler;
    if (source === 'growth_records') return this.growthHandler;
    if (source === 'appointments') return this.appointmentHandler;
    if (source === 'nutrition_logs') return this.nutritionHandler;
    if (source === 'health_medications') return this.medicationHandler;

    // 2. Extra data & subtype precedence
    if (extraData?.record_type === 'medication') return this.medicationHandler;

    const cat = (category || '').toLowerCase().trim();

    if (cat === 'asi') return this.vaccineHandler;
    if (cat === 'parazit') return this.parasiteHandler;
    if (cat === 'ilac') return this.medicationHandler;

    if (cat === 'saglik') {
      const sub = (subType || '').toLowerCase();
      if (sub.includes('kilo') || sub.includes('ölçüm') || sub.includes('growth')) {
        return this.growthHandler;
      }
      if (sub.includes('randevu') || sub.includes('kontrol') || sub.includes('muayene') || sub.includes('vet')) {
        return this.appointmentHandler;
      }
    }

    const registered = this.handlers.get(cat);
    if (registered) return registered;

    return this.genericHandler;
  }

  getHandler(category: string, subType?: string, extraData?: any): AgendaReadHandler {
    return this.getHandlerForRecord('plans', category, subType, extraData);
  }
}

export const agendaReadRegistry = new AgendaReadRegistry();
