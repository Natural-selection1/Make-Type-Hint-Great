import * as vscode from 'vscode';
import { ParamCompletionProvider } from './terminal/ParamCompletionProvider';
import { ReturnValueCompletionProvider } from './terminal/ReturnValueCompletionProvider';
import { VariableCompletionProvider } from './terminal/VariableCompletionProvider';
import { paramHintTrigger, returnHintTrigger, variableHintTrigger } from './typeData/BaseTypes';
import { TypeHintSettings } from './settings';
import { ASTService } from './services/ASTService';
import { CacheService } from './services/CacheService';
import { CustomTypeSearch } from './CustomTypeSearch';

/**
 * 当插件被激活时调用此函数
 * 注册三种类型提示的自动完成提供程序:
 * 1. 参数类型提示 (:)
 * 2. 返回值类型提示 (>)
 * 3. 变量类型提示 (:)
 * @param context 插件上下文
 */
export async function activate(context: vscode.ExtensionContext) {
    const settings = new TypeHintSettings();
    const astService = new ASTService();
    const cacheService = new CacheService();

    // 初始化并启动自定义类型搜索
    const customTypeSearch = CustomTypeSearch.getInstance();

    // 解析当前活动文档
    const activeEditor = vscode.window.activeTextEditor;
    if (activeEditor && activeEditor.document.languageId === 'python') {
        await customTypeSearch.parseDocument(activeEditor.document);
    }

    // 监听文档变化
    context.subscriptions.push(
        customTypeSearch.watchCurrentDocument(),
        // 监听活动编辑器变化
        vscode.window.onDidChangeActiveTextEditor(async editor => {
            if (editor && editor.document.languageId === 'python') {
                await customTypeSearch.parseDocument(editor.document);
            }
        })
    );

    // 注册文档变更监听
    context.subscriptions.push(
        vscode.workspace.onDidChangeTextDocument(event => {
            const uri = event.document.uri.toString();
            // 更新AST缓存
            const tree = astService.parseCode(event.document.getText());
            cacheService.cacheTree(uri, tree);
        })
    );

    // 注册自动完成提供程序
    // context.subscriptions用于管理插件的资源释放
    context.subscriptions.push(
        // 注册funcparam提示的自动完成提供程序
        // 只在Python文件中生效
        // paramHintTrigger - 触发自动完成的字符(这里是':')
        vscode.languages.registerCompletionItemProvider(
            'python',
            new ParamCompletionProvider(settings),
            paramHintTrigger
        ),
        // 注册returnValue提示的自动完成提供程序
        // returnHintTrigger - 触发自动完成的字符(这里是'>')
        vscode.languages.registerCompletionItemProvider(
            'python',
            new ReturnValueCompletionProvider(settings),
            returnHintTrigger
        ),
        // 注册variable提示的自动完成提供程序
        vscode.languages.registerCompletionItemProvider(
            'python',
            new VariableCompletionProvider(settings),
            variableHintTrigger // 使用变量类型提示的触发字符
        )
    );
}

/**
 * 当插件被停用时调用此函数
 * 用于清理资源(目前无需清理)
 */
export function deactivate() {}
