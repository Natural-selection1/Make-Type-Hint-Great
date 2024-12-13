import { CompletionItem, TextDocument } from 'vscode';
import { BaseTypeProcess } from './BaseTypeProcess';
import { TypeHintSettings } from '../settings';
import SearchedTypes from '../typeData/SearchedTypes';

/**
 * 自定义类型处理中间件
 * 处理所有从Python文件中收集到的自定义类型
 */
export class CustomTypeProcess extends BaseTypeProcess {
    private searchedTypes: SearchedTypes;

    constructor(settings: TypeHintSettings, itemSortPrefix: number = 80) {
        super(settings, itemSortPrefix);
        this.searchedTypes = SearchedTypes.getInstance();
    }

    /**
     * 获取本地定义的类的提示
     */
    public getLocalClassHints(document: TextDocument): CompletionItem[] {
        const items: CompletionItem[] = [];
        const sortTextPrefix = this.itemSortPrefix.toString();

        // 遍历所有本地类
        for (const [className, info] of this.searchedTypes.getLocalClasses()) {
            // 如果类有基类且设置了appendBrackets，添加类型参数占位符
            const hint = this.settings.appendBrackets && info.baseClasses.length > 0
                ? `${className}[]`
                : className;
            items.push(this.newCompletionItem(hint, sortTextPrefix, document));
        }

        return items;
    }

    /**
     * 获取导入的类的提示
     */
    public getImportedClassHints(document: TextDocument): CompletionItem[] {
        const items: CompletionItem[] = [];
        const sortTextPrefix = (this.itemSortPrefix + 1).toString();

        // 遍历所有导入的类
        for (const [className, info] of this.searchedTypes.getImportedClasses()) {
            const hint = this.settings.appendBrackets
                ? `${className}[]`
                : className;
            items.push(this.newCompletionItem(hint, sortTextPrefix, document));
        }

        return items;
    }

    /**
     * 获取类型别名的提示
     */
    public getTypeAliasHints(document: TextDocument): CompletionItem[] {
        const items: CompletionItem[] = [];
        const sortTextPrefix = (this.itemSortPrefix + 2).toString();

        // 遍历所有类型别名
        for (const [aliasName, info] of this.searchedTypes.getTypeAliases()) {
            items.push(this.newCompletionItem(aliasName, sortTextPrefix, document));
        }

        return items;
    }

    /**
     * 获取类型变量的提示
     */
    public getTypeVarHints(document: TextDocument): CompletionItem[] {
        const items: CompletionItem[] = [];
        const sortTextPrefix = (this.itemSortPrefix + 3).toString();

        // 遍历所有类型变量
        for (const [varName, info] of this.searchedTypes.getTypeVars()) {
            // 如果类型变量有约束条件，添加约束信息
            const hint = info.constraints.length > 0
                ? `${varName}[${info.constraints.join(', ')}]`
                : varName;
            items.push(this.newCompletionItem(hint, sortTextPrefix, document));
        }

        return items;
    }

    /**
     * 获取协议类型的提示
     */
    public getProtocolHints(document: TextDocument): CompletionItem[] {
        const items: CompletionItem[] = [];
        const sortTextPrefix = (this.itemSortPrefix + 4).toString();

        // 遍历所有协议类型
        for (const [protocolName, info] of this.searchedTypes.getProtocols()) {
            // 协议类型通常不需要类型参数
            items.push(this.newCompletionItem(protocolName, sortTextPrefix, document));
        }

        return items;
    }

    /**
     * 获取字面量类型的提示
     */
    public getLiteralTypeHints(document: TextDocument): CompletionItem[] {
        const items: CompletionItem[] = [];
        const sortTextPrefix = (this.itemSortPrefix + 5).toString();

        // 遍历所有字面量类型
        for (const [literalName, info] of this.searchedTypes.getLiteralTypes()) {
            // 添加字面量值作为详细信息
            const item = this.newCompletionItem(literalName, sortTextPrefix, document);
            item.detail = `Literal[${info.values.join(', ')}]`;
            items.push(item);
        }

        return items;
    }

    /**
     * 获取所有自定义类型的提示
     */
    public getAllCustomTypeHints(document: TextDocument): CompletionItem[] {
        return [
            ...this.getLocalClassHints(document),
            ...this.getImportedClassHints(document),
            ...this.getTypeAliasHints(document),
            ...this.getTypeVarHints(document),
            ...this.getProtocolHints(document),
            ...this.getLiteralTypeHints(document)
        ];
    }

    /**
     * 获取指定文件中定义的所有类型的提示
     */
    public getFileTypeHints(filePath: string, document: TextDocument): CompletionItem[] {
        const items: CompletionItem[] = [];
        const sortTextPrefix = this.itemSortPrefix.toString();

        // 获取指定文件中的所有类型
        const fileTypes = this.searchedTypes.getFileTypes(filePath);

        for (const type of fileTypes) {
            const hint = this.settings.appendBrackets && type.isRefinable
                ? `${type.name}[]`
                : type.name;
            items.push(this.newCompletionItem(hint, sortTextPrefix, document));
        }

        return items;
    }
}
