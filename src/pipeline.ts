import Entity from "./entity";
import PipelineTransformer from "./pipeline_transformer";

export default class Pipeline<T> {
    public transformers: Immutable.List<PipelineTransformer<T>>;
    constructor(transformers: Immutable.List<PipelineTransformer<T>>) {
        this.transformers = transformers;
    }
    public execute(initia_state: T): T {
        return this.transformers.reduce((current_state, transformer) => transformer.method.apply(current_state, transformer.parameters), initia_state);
    }
}