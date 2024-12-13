import * as vscode from 'vscode';
import { ParamCompletionProvider } from './terminal/ParamCompletionProvider';
import { ReturnValueCompletionProvider } from './terminal/ReturnValueCompletionProvider';
import { VariableCompletionProvider } from './terminal/VariableCompletionProvider';
import { paramHintTrigger, returnHintTrigger, variableHintTrigger } from './BaseTypes';
import { TypeHintSettings } from './settings';
import { ASTService } from './services/ASTService';
import { CacheService } from './services/CacheService';

/**
 * 当插件被激活时调用此函数
 * 注册三种类型提示的自动完成提供程序:
 * 1. 参数类型提示 (:)
 * 2. 返回值类型提示 (>)
 * 3. 变量类型提示 (:)
 * @param context 插件上下文
 */
export function activate(context: vscode.ExtensionContext) {
    const settings = new TypeHintSettings();
    const astService = new ASTService();
    const cacheService = new CacheService();

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
        // 'python' - 只在Python文件中生效
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
export function deactivate() { }
