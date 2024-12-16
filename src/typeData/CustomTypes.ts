import { EventEmitter } from 'vscode';

/** 类型统计信息接口 */
interface TypeStats {
    /** 类型使用次数 */
    count: number;
    /** 类型分类 */
    category: string;
}

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
    /** 类型别名映射：别名 -> {原始类型, 文件路径} */
    private typeAliases: Map<string, { originalType: string; filePath: string }>;
    /** 类型变量映射：变量名 -> {约束条件, 文件路径} */
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

    /** 类型变更事件发射器 */
    private typesChangedEmitter = new EventEmitter<void>();

    /** 存储类型使用统计信息 */
    private typeStats: Map<string, TypeStats> = new Map();

    /** 私有构造函数，确保单例模式 */
    private constructor() {
        this.typeAliases = new Map();
        this.typeVars = new Map();
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

    private notifyTypesChanged(): void {
        this.typesChangedEmitter.fire();
    }
    // #region 统计信息相关
    /** 更新类型使用统计 */
    private updateTypeStats(typeName: string, category: string) {
        const stats = this.typeStats.get(typeName) || { count: 0, category };
        stats.count++;
        this.typeStats.set(typeName, stats);
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
    // #endregion

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
     * @throws 当类名或文件路径为空时抛出错误
     */
    public addLocalClass(className: string, filePath: string, baseClasses: string[] = []) {
        if (!className || !filePath) {
            throw new Error('类名和文件路径不能为空');
        }
        this.localClasses.set(className, {
            filePath,
            baseClasses,
        });
        this.updateTypeStats(className, 'LocalClass'); // 更新类型统计
        this.notifyTypesChanged();
    }

    /**
     * 添加导入的类
     * @param className 类名
     * @param filePath 导入该类的文件路径
     * @param alias 可选的别名
     */
    public addImportedClass(className: string, filePath: string, alias?: string) {
        this.importedClasses.set(alias || className, {
            originalName: className,
            filePath,
        });
        this.updateTypeStats(className, 'ImportedClass'); // 更新类型统计
        this.notifyTypesChanged();
    }

    /**
     * 添加类型别名
     * @param name 类型别名
     * @param originalType 原始类型
     * @param filePath 定义该类型的文件路径
     */
    public addTypeAlias(name: string, originalType: string, filePath: string) {
        this.typeAliases.set(name, { originalType, filePath });
        this.updateTypeStats(name, 'TypeAlias'); // 更新类型统计
        this.notifyTypesChanged();
    }

    /**
     * 添加类型变量
     * @param name 类型变量名
     * @param constraints 约束条件列表
     * @param filePath 定义该类型的文件路径
     */
    public addTypeVar(name: string, constraints: string[], filePath: string) {
        this.typeVars.set(name, { constraints, filePath });
        this.updateTypeStats(name, 'TypeVar'); // 更新类型统计
        this.notifyTypesChanged();
    }

    /**
     * 添加协议类型
     * @param name 协议名称
     * @param methods 协议方法定义
     * @param filePath 定义该协议的文件路径
     */
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
        this.updateTypeStats(name, 'Protocol'); // 更新类型统计
        this.notifyTypesChanged();
    }

    /**
     * 添加字面量类型
     * @param name 类型名称
     * @param values 字面量值列表
     * @param filePath 定义该类型的文件路径
     */
    public addLiteralType(name: string, values: (string | number | boolean)[], filePath: string) {
        this.literalTypes.set(name, { values, filePath });
        this.updateTypeStats(name, 'LiteralType'); // 更新类型统计
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
     * 移除指定文件中的所有类型定义
     * @param filePath 要移除的文件路径
     */
    public removeAllFileData(filePath: string) {
        this.removeFromMap(this.localClasses, filePath);
        this.removeFromMap(this.importedClasses, filePath);

        for (const [name, info] of this.typeAliases.entries()) {
            if (info.filePath === filePath) {
                this.typeAliases.delete(name);
            }
        }

        for (const [name, info] of this.typeVars.entries()) {
            if (info.filePath === filePath) {
                this.typeVars.delete(name);
            }
        }

        for (const [name, info] of this.protocols.entries()) {
            if (info.filePath === filePath) {
                this.protocols.delete(name);
            }
        }

        for (const [name, info] of this.literalTypes.entries()) {
            if (info.filePath === filePath) {
                this.literalTypes.delete(name);
            }
        }

        this.resetTypeStats();
        this.notifyTypesChanged();
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
     * 获取所有本地类的映射
     * @returns 本地类映射
     */
    public getLocalClasses(): Map<string, { filePath: string; baseClasses: string[] }> {
        return this.localClasses;
    }

    /**
     * 获取所有导入类的映射
     * @returns 导入类映射
     */
    public getImportedClasses(): Map<string, { originalName: string; filePath: string }> {
        return this.importedClasses;
    }

    /**
     * 获取所有类型别名的映射
     * @returns 类型别名映射
     */
    public getTypeAliases(): Map<string, { originalType: string; filePath: string }> {
        return this.typeAliases;
    }

    /**
     * 获取所有类型变量的映射
     * @returns 类型变量映射
     */
    public getTypeVars(): Map<string, { constraints: string[]; filePath: string }> {
        return this.typeVars;
    }

    /**
     * 获取所有协议类型的映射
     * @returns 协议类型映射
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
     * 获取所有字面量类型的映射
     * @returns 字面量类型映射
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
     * 获取类型使用统计信息
     * @returns 类型统计信息映射
     */
    public getTypeStats(): Map<string, TypeStats> {
        return this.typeStats;
    }

    /**
     * 获取指定文件中定义的所有类型
     * @param filePath 文件路径
     * @returns 类型信息数组，包含类型名称和是否可细化的标志
     */
    public getFileTypes(filePath: string): Array<{
        name: string;
        isRefinable: boolean;
    }> {
        const types: Array<{ name: string; isRefinable: boolean }> = [];

        for (const [className, info] of this.localClasses) {
            if (info.filePath === filePath) {
                types.push({
                    name: className,
                    isRefinable: info.baseClasses.length > 0,
                });
            }
        }

        for (const [aliasName, info] of this.typeAliases) {
            if (info.filePath === filePath) {
                types.push({
                    name: aliasName,
                    isRefinable: false,
                });
            }
        }

        for (const [varName, info] of this.typeVars) {
            if (info.filePath === filePath) {
                types.push({
                    name: varName,
                    isRefinable: info.constraints.length > 0,
                });
            }
        }

        for (const [protocolName, info] of this.protocols) {
            if (info.filePath === filePath) {
                types.push({
                    name: protocolName,
                    isRefinable: false,
                });
            }
        }

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

    /**
     * 注册类型变更监听器
     * @param listener 监听器函数
     */
    public onTypesChanged(listener: () => void): void {
        this.typesChangedEmitter.event(listener);
    }
}
