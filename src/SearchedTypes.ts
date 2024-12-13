/**
 * SearchedTypes类负责存储和管理从Python文件中收集到的类信息
 * 包括本地定义的类和导入的类
 */
export default class SearchedTypes {
    /** 单例模式实例 */
    private static instance: SearchedTypes;
    /** 存储本地定义的类名到文件路径的映射 */
    private localClasses: Map<string, Set<string>> = new Map();
    /** 存储导入的类名到文件路径的映射 */
    private importedClasses: Map<string, Set<string>> = new Map();

    /** 私有构造函数，确保单例模式 */
    private constructor() {}

    /**
     * 获取SearchedTypes的单例实例
     * @returns SearchedTypes实例
     */
    public static getInstance(): SearchedTypes {
        if (!SearchedTypes.instance) {
            SearchedTypes.instance = new SearchedTypes();
        }
        return SearchedTypes.instance;
    }

    /**
     * 添加本地定义的类
     * @param className 类名
     * @param filePath 定义该类的文件路径
     */
    public addLocalClass(className: string, filePath: string) {
        if (!this.localClasses.has(className)) {
            this.localClasses.set(className, new Set());
        }
        this.localClasses.get(className)?.add(filePath);
    }

    /**
     * 添加导入的类
     * @param className 类名
     * @param filePath 导入该类的文件路径
     */
    public addImportedClass(className: string, filePath: string) {
        if (!this.importedClasses.has(className)) {
            this.importedClasses.set(className, new Set());
        }
        this.importedClasses.get(className)?.add(filePath);
    }

    /**
     * 移除指定文件中的所有类定义和导入
     * @param filePath 要移除的文件路径
     */
    public removeFileClasses(filePath: string) {
        this.removeFromMap(this.localClasses, filePath);
        this.removeFromMap(this.importedClasses, filePath);
    }

    /**
     * 从指定Map中移除与文件相关的所有记录
     * @param map 要处理的Map对象
     * @param filePath 要移除的文件路径
     */
    private removeFromMap(map: Map<string, Set<string>>, filePath: string) {
        for (const [className, files] of map.entries()) {
            files.delete(filePath);
            if (files.size === 0) {
                map.delete(className);
            }
        }
    }

    /**
     * 获取所有已知的类名列表
     * @returns 类名数组
     */
    public getAllClasses(): string[] {
        const classSet = new Set<string>();

        for (const className of this.localClasses.keys()) {
            classSet.add(className);
        }

        for (const className of this.importedClasses.keys()) {
            classSet.add(className);
        }

        return Array.from(classSet);
    }

    /**
     * 获取指定类名的所有来源文件路径
     * @param className 类名
     * @returns 文件路径数组
     */
    public getClassSource(className: string): string[] {
        const sources = new Set<string>();

        this.localClasses.get(className)?.forEach(path => sources.add(path));
        this.importedClasses.get(className)?.forEach(path => sources.add(path));

        return Array.from(sources);
    }
}
