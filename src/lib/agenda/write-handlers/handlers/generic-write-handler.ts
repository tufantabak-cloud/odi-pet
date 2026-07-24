import { RoutineWriteHandler } from './routine-write-handler';

export class GenericWriteHandler extends RoutineWriteHandler {
  constructor(category = 'diger') {
    super(category);
  }
}
