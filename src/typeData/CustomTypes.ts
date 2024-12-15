import { EventEmitter } from 'vscode';

// #region TYPE_STATISTICS
/** 类型统计信息接口 */
interface TypeStats {
    /** 类型使用次数 */
    count: number;
    /** 类型分类 */
    category: string;
}

/** 类型统计相关的扩展方法 */
interface TypeStatisticsMethods {
    /** 获取类型使用统计信息 */
    getTypeStats(): Map<string, TypeStats>;
    /** 更新类型使用统计 */
    updateTypeStats(typeName: string, category: string): void;
    /** 重置类型统计信息 */
    resetTypeStats(): void;
}
// #endregion TYPE_STATISTICS

/**
 * CustomTypes类负责存储和管理从Python文件中收集到的类型信息
 * 包括:
 * - 本地定义的类
 * - 导入的类
 * - 类型别名
 * - 类型变量
 * - 协议类型
 * - 字面量类型
 *
 * 提供单例模式访问和完整的类型信息管理功能
 */
export default class CustomTypes {
    /** 单例模式实例 */
    private static instance: CustomTypes;
    /** 存储本地定义的类名到文件路径和基类信息的映射 */
    private localClasses: Map<string, { filePath: string; baseClasses: string[] }> = new Map();
    /** 存储导入的类名到原始名称和文件路径的映射 */
    private importedClasses: Map<string, { originalName: string; filePath: string }> = new Map();
    private typeAliases: Map<string, { originalType: string; filePath: string }>;
    private typeVars: Map<string, { constraints: string[]; filePath: string }>;
    /** 存储协议类型定义 */
    private protocols: Map<
        string,
        {
            methods: {
                [key: string]: {
                    params: string[];
                    returnType: string;
                };
            };
            filePath: string;
        }
    > = new Map();
    /** 存储字面量类型 */
    private literalTypes: Map<
        string,
        {
            values: (string | number | boolean)[];
            filePath: string;
        }
    > = new Map();

    private typesChangedEmitter = new EventEmitter<void>();

    // #region TYPE_STATISTICS_IMPLEMENTATION
    /** 存储类型使用统计信息 */
    private typeStats: Map<string, TypeStats> = new Map();

    /** 更新类型使用统计 */
    private updateTypeStats(typeName: string, category: string) {
        const stats = this.typeStats.get(typeName) || { count: 0, category };
        stats.count++;
        this.typeStats.set(typeName, stats);
    }

    /** 获取类型使用统计信息 */
    public getTypeStats(): Map<string, TypeStats> {
        return this.typeStats;
    }

    /** 重置类型统计信息 */
    private resetTypeStats() {
        this.typeStats.clear();
        this.localClasses.forEach((_, name) => this.updateTypeStats(name, 'LocalClass'));
        this.importedClasses.forEach((_, name) => this.updateTypeStats(name, 'ImportedClass'));
        this.typeAliases.forEach((_, name) => this.updateTypeStats(name, 'TypeAlias'));
        this.typeVars.forEach((_, name) => this.updateTypeStats(name, 'TypeVar'));
        this.protocols.forEach((_, name) => this.updateTypeStats(name, 'Protocol'));
        this.literalTypes.forEach((_, name) => this.updateTypeStats(name, 'LiteralType'));
    }
    // #endregion TYPE_STATISTICS_IMPLEMENTATION

    /** 私有构造函数，确保单例模式 */
    private constructor() {
        this.typeAliases = new Map();
        this.typeVars = new Map();
    }

    /**
     * 获取SearchedTypes的单例实例
     * @returns SearchedTypes实例
     */
    public static getInstance(): CustomTypes {
        if (!CustomTypes.instance) {
            CustomTypes.instance = new CustomTypes();
        }
        return CustomTypes.instance;
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
            baseClasses,
        });
        // #region TYPE_STATISTICS_USAGE
        this.updateTypeStats(className, 'LocalClass');
        // #endregion TYPE_STATISTICS_USAGE
        this.notifyTypesChanged();
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
            filePath,
        });
        // #region TYPE_STATISTICS_USAGE
        this.updateTypeStats(className, 'ImportedClass');
        // #endregion TYPE_STATISTICS_USAGE
        this.notifyTypesChanged();
    }

    /**
     * 移除指定文件中的所有类定义和导入
     * @param filePath 要移除的文件路径
     */
    public removeFileClasses(filePath: string) {
        this.removeFromMap(this.localClasses, filePath);
        this.removeFromMap(this.importedClasses, filePath);
        this.notifyTypesChanged();
    }

    /**
     * 从指定Map中移除与文件相关的所有记录
     * @param map 要处理的Map对象
     * @param filePath 要移除的文件路径
     */
    private removeFromMap(
        map: Map<
            string,
            | { filePath: string; baseClasses?: string[] }
            | { originalName: string; filePath: string }
        >,
        filePath: string
    ) {
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
        this.typeAliases.set(name, { originalType, filePath });
        // #region TYPE_STATISTICS_USAGE
        this.updateTypeStats(name, 'TypeAlias');
        // #endregion TYPE_STATISTICS_USAGE
        this.notifyTypesChanged();
    }

    /**
     * 添加类型变量
     * @param name 类型变量名
     * @param constraints 约束条件
     * @param filePath 定义该类型的文件路径
     */
    public addTypeVar(name: string, constraints: string[], filePath: string) {
        this.typeVars.set(name, { constraints, filePath });
        // #region TYPE_STATISTICS_USAGE
        this.updateTypeStats(name, 'TypeVar');
        // #endregion TYPE_STATISTICS_USAGE
        this.notifyTypesChanged();
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

        // #region TYPE_STATISTICS_USAGE
        this.resetTypeStats();
        // #endregion TYPE_STATISTICS_USAGE

        this.notifyTypesChanged();
    }

    /** 添加协议类型 */
    public addProtocol(
        name: string,
        methods: {
            [key: string]: {
                params: string[];
                returnType: string;
            };
        },
        filePath: string
    ) {
        this.protocols.set(name, { methods, filePath });
        // #region TYPE_STATISTICS_USAGE
        this.updateTypeStats(name, 'Protocol');
        // #endregion TYPE_STATISTICS_USAGE
        this.notifyTypesChanged();
    }

    /** 添加字面量类型 */
    public addLiteralType(name: string, values: (string | number | boolean)[], filePath: string) {
        this.literalTypes.set(name, { values, filePath });
        // #region TYPE_STATISTICS_USAGE
        this.updateTypeStats(name, 'LiteralType');
        // #endregion TYPE_STATISTICS_USAGE
        this.notifyTypesChanged();
    }

    /**
     * 获取所有本地类的Map
     */
    public getLocalClasses(): Map<string, { filePath: string; baseClasses: string[] }> {
        return this.localClasses;
    }

    /**
     * 获取所有导入类的Map
     */
    public getImportedClasses(): Map<string, { originalName: string; filePath: string }> {
        return this.importedClasses;
    }

    /**
     * 获取所有类型别名的Map
     */
    public getTypeAliases(): Map<string, { originalType: string; filePath: string }> {
        return this.typeAliases;
    }

    /**
     * 获取所有类型变量的Map
     */
    public getTypeVars(): Map<string, { constraints: string[]; filePath: string }> {
        return this.typeVars;
    }

    /**
     * 获取所有协议类型的Map
     */
    public getProtocols(): Map<
        string,
        {
            methods: {
                [key: string]: {
                    params: string[];
                    returnType: string;
                };
            };
            filePath: string;
        }
    > {
        return this.protocols;
    }

    /**
     * 获取所有字面量类型的Map
     */
    public getLiteralTypes(): Map<
        string,
        {
            values: (string | number | boolean)[];
            filePath: string;
        }
    > {
        return this.literalTypes;
    }

    /**
     * 获取指定文件中定义的所有类型
     * @param filePath 文件路径
     */
    public getFileTypes(filePath: string): Array<{
        name: string;
        isRefinable: boolean;
    }> {
        const types: Array<{ name: string; isRefinable: boolean }> = [];

        // 收集本地类
        for (const [className, info] of this.localClasses) {
            if (info.filePath === filePath) {
                types.push({
                    name: className,
                    isRefinable: info.baseClasses.length > 0,
                });
            }
        }

        // 收集类型别名
        for (const [aliasName, info] of this.typeAliases) {
            if (info.filePath === filePath) {
                types.push({
                    name: aliasName,
                    isRefinable: false,
                });
            }
        }

        // 收集类型变量
        for (const [varName, info] of this.typeVars) {
            if (info.filePath === filePath) {
                types.push({
                    name: varName,
                    isRefinable: info.constraints.length > 0,
                });
            }
        }

        // 收集协议类型
        for (const [protocolName, info] of this.protocols) {
            if (info.filePath === filePath) {
                types.push({
                    name: protocolName,
                    isRefinable: false,
                });
            }
        }

        // 收集字面量类型
        for (const [literalName, info] of this.literalTypes) {
            if (info.filePath === filePath) {
                types.push({
                    name: literalName,
                    isRefinable: false,
                });
            }
        }

        return types;
    }

    public onTypesChanged(listener: () => void): void {
        this.typesChangedEmitter.event(listener);
    }

    private notifyTypesChanged(): void {
        this.typesChangedEmitter.fire();
    }
}
