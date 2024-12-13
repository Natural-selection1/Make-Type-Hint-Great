import * as vscode from 'vscode';
import {
    CancellationToken,
    CompletionContext,
    CompletionList,
    CompletionItem,
    Position,
    TextDocument,
} from 'vscode';
import { TypeHintSettings } from './settings';
import { BaseTypeProcess } from './BaseTypeProcess';

/**
 * 自动完成提供程序的基类
 * 提供了处理类型提示的基本功能
 *
 * 主要功能:
 * - 提供类型提示的基础设施
 * - 处理内置类型和typing模块类型
 * - 管理自动完成项的排序和显示
 * - 处理类型导入语句
 */
export abstract class BaseCompletionProvider implements vscode.CompletionItemProvider {
    // 类型提示的配置选项
    protected settings: TypeHintSettings;
    // 用于排序的前缀数字,默认为90
    protected itemSortPrefix: number = 90;
    // 当前正在处理的文档
    protected currentDocument?: TextDocument;
    // 类型处理器实例
    protected typeProcess: BaseTypeProcess;

    /**
     * 构造函数
     * @param settings 类型提示的配置选项
     */
    constructor(settings: TypeHintSettings) {
        this.settings = settings;
        this.typeProcess = new BaseTypeProcess(settings, this.itemSortPrefix);
    }

    /**
     * 提供自动完成项的抽象方法
     * 子类必须实现此方法来提供具体的自动完成功能
     *
     * @param doc 当前文档
     * @param pos 光标位置
     * @param token 取消令牌
     * @param context 自动完成上下文
     * @returns 返回CompletionList或null
     */
    abstract provideCompletionItems(
        doc: TextDocument,
        pos: Position,
        token: CancellationToken,
        context: CompletionContext
    ): Promise<CompletionList | null>;

    /**
     * 处理类型提示的主要逻辑
     *
     * @param name 参数名称
     * @param documentText 文档文本
     * @param items 自动完成项数组
     * @param token 取消令牌
     * @param doc 当前文档
     */
    protected async processTypeHints(
        name: string,
        documentText: string,
        items: CompletionItem[],
        token: CancellationToken,
        doc: TextDocument
    ): Promise<void> {
        // 添加内置类型提示
        items.push(...this.typeProcess.getBuiltinHints(doc));
        // 增加排序前缀以确保正确的显示顺序
        this.itemSortPrefix++;
        // 添加typing模块类型提示
        items.push(...this.typeProcess.getTypingHints(doc));
    }
}
