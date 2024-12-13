import {
    TextDocument,
    Position,
    CancellationToken,
    CompletionContext,
    CompletionList,
    TextLine,
    CompletionItem,
} from 'vscode';
import { BaseCompletionProvider } from '../BaseCompletionProvider';
import { returnHintTrigger, BuiltinTypes, getDataTypeContainer } from '../BaseTypes';

/**
 * Python函数返回值类型提示的自动完成提供程序
 * 继承自BaseCompletionProvider基类
 *
 * 主要功能:
 * - 检测函数返回值类型提示的触发条件
 * - 提供内置类型和typing模块类型的自动完成
 * - 支持在输入 -> 后触发提示
 */
export class ReturnValueCompletionProvider extends BaseCompletionProvider {
    /**
     * 判断是否应该提供自动完成项
     *
     * @param line 当前行对象
     * @param pos 光标位置
     * @returns 是否应该提供自动完成
     *
     * 触发条件:
     * 1. 光标位置大于0
     * 2. 光标前两个字符是 ->
     * 3. 当前行匹配函数定义的返回值类型模式: ) ->
     */
    private shouldProvideItems(line: TextLine, pos: Position): boolean {
        // 检查光标位置和前两个字符
        if (pos.character > 0 && line.text.substring(pos.character - 2, pos.character) === '->') {
            // 检查是否匹配函数返回值类型的模式
            return /\) *->[: ]*$/m.test(line.text);
        }
        return false;
    }

    /**
     * 提供自动完成项的主要方法
     *
     * @param doc 当前文档
     * @param pos 光标位置
     * @param token 取消令牌
     * @param context 自动完成上下文
     * @returns CompletionList对象或null
     *
     * 处理流程:
     * 1. 检查触发字符是否正确(是否为>)
     * 2. 判断是否应该提供自动完成
     * 3. 生成并返回类型提示列表
     */
    public async provideCompletionItems(
        doc: TextDocument,
        pos: Position,
        token: CancellationToken,
        context: CompletionContext
    ): Promise<CompletionList | null> {
        // 检查触发字符是否为>
        if (context.triggerCharacter !== returnHintTrigger) {
            return null;
        }

        // 初始化自动完成项数组
        const items: CompletionItem[] = [];
        const line = doc.lineAt(pos);

        // 如果满足提供条件且未取消，生成类型提示
        if (this.shouldProvideItems(line, pos)) {
            await this.processTypeHints('', doc.getText(), items, token, doc);
        }
        return new CompletionList(items, false);
    }
}
