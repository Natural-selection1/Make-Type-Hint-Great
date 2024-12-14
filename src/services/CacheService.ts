import type { Tree } from 'tree-sitter';
import { DataType } from '../typeData/BaseTypes';

export class CacheService {
    private documentCache: Map<string, Tree> = new Map();
    private typeCache: Map<string, DataType[]> = new Map();

    public getCachedTree(documentUri: string): Tree | undefined {
        return this.documentCache.get(documentUri);
    }

    public cacheTree(documentUri: string, tree: Tree): void {
        this.documentCache.set(documentUri, tree);
    }

    public getCachedTypes(documentUri: string): DataType[] | undefined {
        return this.typeCache.get(documentUri);
    }

    public cacheTypes(documentUri: string, types: DataType[]): void {
        this.typeCache.set(documentUri, types);
    }

    public clearCache(documentUri: string): void {
        this.documentCache.delete(documentUri);
        this.typeCache.delete(documentUri);
    }
}
