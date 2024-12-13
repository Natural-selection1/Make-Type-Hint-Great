/**
 * SearchedTypes类负责存储和管理从Python文件中收集到的类信息
 * 包括本地定义的类和导入的类
 */
export default class SearchedTypes {
    /** 单例模式实例 */
    private static instance: SearchedTypes;
    /** 存储本地定义的类名到文件路径的映射 */
    private localClasses: Map<string, {filePath: string, baseClasses: string[]}> = new Map();
    /** 存储导入的类名到文件路径的映射 */
    private importedClasses: Map<string, {originalName: string, filePath: string}> = new Map();
    private typeAliases: Map<string, {originalType: string, filePath: string}>;
    private typeVars: Map<string, {constraints: string[], filePath: string}>;
    /** 存储协议类型定义 */
    private protocols: Map<string, {
        methods: {[key: string]: {
            params: string[],
            returnType: string
        }},
        filePath: string
    }> = new Map();
    /** 存储字面量类型 */
    private literalTypes: Map<string, {
        values: (string | number | boolean)[],
        filePath: string
    }> = new Map();

    /** 私有构造函数，确保单例模式 */
    private constructor() {
        this.typeAliases = new Map();
        this.typeVars = new Map();
    }

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
     * @param baseClasses 基类列表
     */
    public addLocalClass(className: string, filePath: string, baseClasses: string[] = []) {
        if (!className || !filePath) {
            throw new Error('类名和文件路径不能为空');
        }
        this.localClasses.set(className, {
            filePath,
            baseClasses
        });
    }

    /**
     * 添加导入的类
     * @param className 类名
     * @param filePath 导入该类的文件路径
     * @param alias 别名
     */
    public addImportedClass(className: string, filePath: string, alias?: string) {
        this.importedClasses.set(alias || className, {
            originalName: className,
            filePath
        });
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
    private removeFromMap(map: Map<string, {filePath: string, baseClasses?: string[]} | {originalName: string, filePath: string}>, filePath: string) {
        for (const [className, value] of map.entries()) {
            if ('filePath' in value && value.filePath === filePath) {
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

        const localClass = this.localClasses.get(className);
        if (localClass) {
            sources.add(localClass.filePath);
        }

        const importedClass = this.importedClasses.get(className);
        if (importedClass) {
            sources.add(importedClass.filePath);
        }

        return Array.from(sources);
    }

    /**
     * 添加类型别名
     * @param name 类型别名
     * @param originalType 原始类型
     * @param filePath 定义该类型的文件路径
     */
    public addTypeAlias(name: string, originalType: string, filePath: string) {
        this.typeAliases.set(name, {originalType, filePath});
    }

    /**
     * 添加类型变量
     * @param name 类型变量名
     * @param constraints 约束条件
     * @param filePath 定义该类型的文件路径
     */
    public addTypeVar(name: string, constraints: string[], filePath: string) {
        this.typeVars.set(name, {constraints, filePath});
    }

    /**
     * 移除指定文件中的所有类型定义和导入
     * @param filePath 要移除的文件路径
     */
    public removeAllFileData(filePath: string) {
        this.removeFromMap(this.localClasses, filePath);
        this.removeFromMap(this.importedClasses, filePath);

        // 清理类型别名
        for (const [name, info] of this.typeAliases.entries()) {
            if (info.filePath === filePath) {
                this.typeAliases.delete(name);
            }
        }

        // 清理类型变量
        for (const [name, info] of this.typeVars.entries()) {
            if (info.filePath === filePath) {
                this.typeVars.delete(name);
            }
        }

        // 清理协议类型
        for (const [name, info] of this.protocols.entries()) {
            if (info.filePath === filePath) {
                this.protocols.delete(name);
            }
        }

        // 清理字面量类型
        for (const [name, info] of this.literalTypes.entries()) {
            if (info.filePath === filePath) {
                this.literalTypes.delete(name);
            }
        }
    }

    /** 添加协议类型 */
    public addProtocol(name: string, methods: {[key: string]: {
        params: string[],
        returnType: string
    }}, filePath: string) {
        this.protocols.set(name, {methods, filePath});
    }

    /** 添加字面量类型 */
    public addLiteralType(name: string, values: (string | number | boolean)[], filePath: string) {
        this.literalTypes.set(name, {values, filePath});
    }

    /**
     * 获取所有本地类的Map
     */
    public getLocalClasses(): Map<string, {filePath: string, baseClasses: string[]}> {
        return this.localClasses;
    }

    /**
     * 获取所有导入类的Map
     */
    public getImportedClasses(): Map<string, {originalName: string, filePath: string}> {
        return this.importedClasses;
    }

    /**
     * 获取所有类型别名的Map
     */
    public getTypeAliases(): Map<string, {originalType: string, filePath: string}> {
        return this.typeAliases;
    }

    /**
     * 获取所有类型变量的Map
     */
    public getTypeVars(): Map<string, {constraints: string[], filePath: string}> {
        return this.typeVars;
    }

    /**
     * 获取所有协议类型的Map
     */
    public getProtocols(): Map<string, {
        methods: {[key: string]: {
            params: string[],
            returnType: string
        }},
        filePath: string
    }> {
        return this.protocols;
    }

    /**
     * 获取所有字面量类型的Map
     */
    public getLiteralTypes(): Map<string, {
        values: (string | number | boolean)[],
        filePath: string
    }> {
        return this.literalTypes;
    }

    /**
     * 获取指定文件中定义的所有类型
     * @param filePath 文件路径
     */
    public getFileTypes(filePath: string): Array<{
        name: string,
        isRefinable: boolean
    }> {
        const types: Array<{name: string, isRefinable: boolean}> = [];

        // 收集本地类
        for (const [className, info] of this.localClasses) {
            if (info.filePath === filePath) {
                types.push({
                    name: className,
                    isRefinable: info.baseClasses.length > 0
                });
            }
        }

        // 收集类型别名
        for (const [aliasName, info] of this.typeAliases) {
            if (info.filePath === filePath) {
                types.push({
                    name: aliasName,
                    isRefinable: false
                });
            }
        }

        // 收集类型变量
        for (const [varName, info] of this.typeVars) {
            if (info.filePath === filePath) {
                types.push({
                    name: varName,
                    isRefinable: info.constraints.length > 0
                });
            }
        }

        // 收集协议类型
        for (const [protocolName, info] of this.protocols) {
            if (info.filePath === filePath) {
                types.push({
                    name: protocolName,
                    isRefinable: false
                });
            }
        }

        // 收集字面量类型
        for (const [literalName, info] of this.literalTypes) {
            if (info.filePath === filePath) {
                types.push({
                    name: literalName,
                    isRefinable: false
                });
            }
        }

        return types;
    }
}
