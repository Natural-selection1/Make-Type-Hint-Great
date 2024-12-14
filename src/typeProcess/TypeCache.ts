import { CompletionItem, TextDocument } from 'vscode';
import { CacheService } from '../services/CacheService';
import CustomTypes from '../typeData/CustomTypes';

/**
 * 类型提示缓存管理类
 * 用于缓存CompletionItem以提高性能
 */
export class TypeCache {
    private static instance: TypeCache;
    private cache: Map<
        string,
        {
            items: CompletionItem[];
            version: number; // 使用版本号替代时间戳
            document: string;
        }
    > = new Map();

    private cacheService: CacheService;
    private customTypes: CustomTypes;
    private currentVersion: number = 0;

    private constructor() {
        this.cacheService = new CacheService();
        this.customTypes = CustomTypes.getInstance();

        // 监听自定义类型变化
        this.customTypes.onTypesChanged(() => {
            this.currentVersion++; // 增加版本号使所有缓存失效
        });
    }

    public static getInstance(): TypeCache {
        if (!TypeCache.instance) {
            TypeCache.instance = new TypeCache();
        }
        return TypeCache.instance;
    }

    /**
     * 获取或创建缓存项
     */
    public getOrCreate(
        key: string,
        document: TextDocument,
        creator: () => CompletionItem[]
    ): CompletionItem[] {
        const cacheKey = this.generateCacheKey(key, document);
        const cached = this.cache.get(cacheKey);

        if (cached && cached.version === this.currentVersion) {
            return cached.items;
        }

        const items = creator();
        this.cache.set(cacheKey, {
            items,
            version: this.currentVersion,
            document: document.uri.toString(),
        });

        return items;
    }

    /**
     * 清除指定文档的缓存
     */
    public clearDocumentCache(document: TextDocument): void {
        const documentUri = document.uri.toString();
        for (const [key, value] of this.cache.entries()) {
            if (value.document === documentUri) {
                this.cache.delete(key);
            }
        }
    }

    /**
     * 生成缓存键
     */
    private generateCacheKey(key: string, document: TextDocument): string {
        return `${document.uri.toString()}:${key}`;
    }
}
