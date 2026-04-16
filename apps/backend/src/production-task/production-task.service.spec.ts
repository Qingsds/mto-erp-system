import { Test, TestingModule } from '@nestjs/testing';
import { ProductionTaskService } from './production-task.service';

describe('ProductionTaskService', () => {
  let service: ProductionTaskService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProductionTaskService],
    }).compile();

    service = module.get<ProductionTaskService>(ProductionTaskService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
