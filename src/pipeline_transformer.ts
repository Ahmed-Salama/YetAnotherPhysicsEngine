export default class PipelineTransformer<T> {
    public method: (..._: any[]) => T;
    public parameters: any[];
    constructor(method: (..._: any[]) => T, parameters: any[]) {
        this.method = method;
        this.parameters = parameters;
    }
}