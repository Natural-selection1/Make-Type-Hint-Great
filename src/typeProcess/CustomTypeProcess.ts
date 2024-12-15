import { CompletionItem, CompletionItemKind, TextDocument, SnippetString } from 'vscode';
import { BaseTypeProcess } from './BaseTypeProcess';
import { TypeHintSettings } from '../settings';
import CustomTypes from '../typeData/CustomTypes';
import { TypeCategory } from '../typeData/BaseTypes';
import * as fs from 'fs';
import * as path from 'path';

/**
 * 自定义类型处理中间件
 * 处理所有从Python文件中收集到的自定义类型
 */
export class CustomTypeProcess extends BaseTypeProcess {
    private searchedTypes: CustomTypes;
    private static TYPE_SOURCE = '[custom]';
    private static DEBUG_FILE = 'E:\\0000__Python_Project\\00__Make_Type_Hint_Great\\DeBug.txt';

    // 添加 typeVariables 属性
    protected typeVariables: Set<string> = new Set<string>();

    constructor(settings: TypeHintSettings, itemSortPrefix: number = 80) {
        super(settings, itemSortPrefix);
        this.searchedTypes = CustomTypes.getInstance();
    }

    /**
     * 写入调试信息到文件
     */
    private writeDebugInfo(content: string) {
        try {
            fs.writeFileSync(CustomTypeProcess.DEBUG_FILE, content);
        } catch (error) {
            console.error('写入调试文件失败:', error);
        }
    }

    /**
     * 创建自定义类型的补全项
     */
    protected createCustomCompletionItem(
        hint: string,
        sortTextPrefix: string,
        document: TextDocument,
        detail?: string,
        isRefinable: boolean = false
    ): CompletionItem {
        const item = new CompletionItem(hint.trim(), CompletionItemKind.TypeParameter);
        item.sortText = `${sortTextPrefix}${hint}`;
        item.detail = detail || CustomTypeProcess.TYPE_SOURCE;

        if (isRefinable && this.settings.appendBrackets) {
            item.insertText = new SnippetString(`${hint}[$1]`);
        }

        return item;
    }

    /**
     * 获取所有自定义类型的提示(使用缓存)
     */
    public getAllCustomTypeHints(document: TextDocument): CompletionItem[] {
        return this.typeCache.getOrCreate(`allCustomTypes:${document.uri.fsPath}`, document, () => {
            const currentFilePath = document.uri.fsPath;
            const items: CompletionItem[] = [];
            let debugOutput = '';

            // 获取本地类
            const localClasses = Array.from(this.searchedTypes.getLocalClasses());
            const localClassesInFile = localClasses.filter(
                ([_, info]) => info.filePath === currentFilePath
            );
            if (localClassesInFile.length > 0) {
                debugOutput += `\n找到 ${localClassesInFile.length} 个本地类:\n`;
                localClassesInFile.forEach(([className, info]) => {
                    debugOutput += `- 本地类: ${className}${info.baseClasses.length > 0 ? `, 继承自: ${info.baseClasses.join(', ')}` : ''}\n`;
                });
            }

            // 获取导入的类
            const importedClasses = Array.from(this.searchedTypes.getImportedClasses());
            const importedClassesInFile = importedClasses.filter(
                ([_, info]) => info.filePath === currentFilePath
            );
            if (importedClassesInFile.length > 0) {
                debugOutput += `找到 ${importedClassesInFile.length} 个导入的类:\n`;
                importedClassesInFile.forEach(([className, info]) => {
                    debugOutput += `- 导入的类: ${className}, 原始名称: ${info.originalName}\n`;
                });
            }

            // 获取类型别名
            const typeAliases = Array.from(this.searchedTypes.getTypeAliases());
            const typeAliasesInFile = typeAliases.filter(
                ([_, info]) => info.filePath === currentFilePath
            );
            if (typeAliasesInFile.length > 0) {
                debugOutput += `找到 ${typeAliasesInFile.length} 个类型别名:\n`;
                typeAliasesInFile.forEach(([aliasName, info]) => {
                    debugOutput += `- 类型别名: ${aliasName}, 原始类型: ${info.originalType}\n`;
                });
            }

            // 获取类型变量
            const typeVars = Array.from(this.searchedTypes.getTypeVars());
            const typeVarsInFile = typeVars.filter(
                ([_, info]) => info.filePath === currentFilePath
            );
            if (typeVarsInFile.length > 0) {
                debugOutput += `找到 ${typeVarsInFile.length} 个类型变量:\n`;
                typeVarsInFile.forEach(([varName, info]) => {
                    debugOutput += `- 类型变量: ${varName}${info.constraints.length > 0 ? `, 约束: ${info.constraints.join(' & ')}` : ''}\n`;
                });
            }

            // 获取协议类型
            const protocols = Array.from(this.searchedTypes.getProtocols());
            const protocolsInFile = protocols.filter(
                ([_, info]) => info.filePath === currentFilePath
            );
            if (protocolsInFile.length > 0) {
                debugOutput += `找到 ${protocolsInFile.length} 个协议类型:\n`;
                protocolsInFile.forEach(([protocolName, info]) => {
                    const methodCount = Object.keys(info.methods).length;
                    debugOutput += `- 协议: ${protocolName}, 包含 ${methodCount} 个方法\n`;
                });
            }

            // 获取字面量类型
            const literals = Array.from(this.searchedTypes.getLiteralTypes());
            const literalsInFile = literals.filter(
                ([_, info]) => info.filePath === currentFilePath
            );
            if (literalsInFile.length > 0) {
                debugOutput += `找到 ${literalsInFile.length} 个字面量类型:\n`;
                literalsInFile.forEach(([literalName, info]) => {
                    debugOutput += `- 字面量类型: ${literalName}, 值: ${info.values.join(' | ')}\n`;
                });
            }

            // 添加总结信息
            debugOutput += '\n类型搜索总结:\n';
            debugOutput += `本地类: ${localClassesInFile.length}个\n`;
            debugOutput += `导入的类: ${importedClassesInFile.length}个\n`;
            debugOutput += `类型别名: ${typeAliasesInFile.length}个\n`;
            debugOutput += `类型变量: ${typeVarsInFile.length}个\n`;
            debugOutput += `协议类型: ${protocolsInFile.length}个\n`;
            debugOutput += `字面量类型: ${literalsInFile.length}个\n`;
            debugOutput += `总计: ${items.length}个类型\n\n`;

            // 写入调试文件
            this.writeDebugInfo(debugOutput);

            // 同时也在控制台输出
            console.log(debugOutput);

            return items;
        });
    }

    /**
     * 获取指定文件中定义的所有类型的提示(使用缓存)
     */
    public getFileTypeHints(filePath: string, document: TextDocument): CompletionItem[] {
        return this.typeCache.getOrCreate(`file:${filePath}`, document, () => {
            const items: CompletionItem[] = [];
            const sortTextPrefix = this.itemSortPrefix.toString();
            const fileTypes = this.searchedTypes.getFileTypes(filePath);

            for (const type of fileTypes) {
                items.push(
                    this.createCustomCompletionItem(
                        type.name,
                        sortTextPrefix,
                        document,
                        `${CustomTypeProcess.TYPE_SOURCE} (Defined in current file)`,
                        type.isRefinable
                    )
                );
            }

            return items;
        });
    }

    /**
     * 处理类型变量
     */
    protected processTypeVariable(node: any): void {
        // 确保节点有效且有名称
        if (!node || !node.name) {
            return;
        }

        // 过滤掉空字符串或只包含空白字符的名称
        const name = node.name.trim();
        if (!name) {
            return;
        }

        // 添加到类型变量集合中
        this.typeVariables.add(name);
    }

    /**
     * 重写基类的处理节点方法
     */
    protected processNode(node: any): void {
        if (!node) return;

        if (node.type === 'TypeVar') {
            this.processTypeVariable(node);
        } else {
            // 调用基类的处理方法
            super.processNode(node);
        }
    }
}
