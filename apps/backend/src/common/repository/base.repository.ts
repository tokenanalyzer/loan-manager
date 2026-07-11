import { DeepPartial, FindOptionsWhere, ObjectLiteral, Repository } from 'typeorm';

/**
 * BaseRepository<T> — generic repository pattern.
 *
 * Phase 2 scope: a reusable abstraction over TypeORM's Repository<T>
 * that feature repositories can extend once real entities exist. It
 * intentionally has no knowledge of any specific domain model (loan,
 * user, document, etc.) — those concrete repositories/entities are
 * out of scope until database schema work begins.
 *
 * Example future usage:
 *   @Injectable()
 *   export class LoanRepository extends BaseRepository<LoanEntity> {
 *     constructor(@InjectRepository(LoanEntity) repo: Repository<LoanEntity>) {
 *       super(repo);
 *     }
 *   }
 */
export abstract class BaseRepository<T extends ObjectLiteral> {
  protected constructor(protected readonly repository: Repository<T>) {}

  async findAll(): Promise<T[]> {
    return this.repository.find();
  }

  async findOneById(id: string | number): Promise<T | null> {
    return this.repository.findOneBy({ id } as unknown as FindOptionsWhere<T>);
  }

  async findOne(where: FindOptionsWhere<T>): Promise<T | null> {
    return this.repository.findOneBy(where);
  }

  async create(data: DeepPartial<T>): Promise<T> {
    const entity = this.repository.create(data);
    return this.repository.save(entity);
  }

  async update(id: string | number, data: DeepPartial<T>): Promise<T | null> {
    await this.repository.update(id, data as never);
    return this.findOneById(id);
  }

  async delete(id: string | number): Promise<boolean> {
    const result = await this.repository.delete(id);
    return (result.affected ?? 0) > 0;
  }
}
