import { Test, TestingModule } from '@nestjs/testing';
import { ProductionTaskController } from './production-task.controller';

describe('ProductionTaskController', () => {
  let controller: ProductionTaskController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductionTaskController],
    }).compile();

    controller = module.get<ProductionTaskController>(ProductionTaskController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
