import * as vscode from 'vscode';
import { ASTService } from './services/ASTService';
import { CacheService } from './services/CacheService';
import SearchedTypes from './SearchedTypes';
import { TypeAnalyzer } from './services/TypeAnalyzer';

/**
 * TypeSearch类负责扫描和解析工作区中的Python文件，
 * 收集所有的类定义和导入信息
 */
export class TypeSearch {
    /** 单例模式实例 */
    private static instance: TypeSearch;
    /** 用于存储搜索到的类型信息 */
    private searchedTypes: SearchedTypes;
    /** AST服务 */
    private astService: ASTService;
    /** 缓存服务 */
    private cacheService: CacheService;

    /** 私有构造函数，确保单例模式 */
    private constructor() {
        this.searchedTypes = SearchedTypes.getInstance();
        this.astService = new ASTService();
        this.cacheService = new CacheService();
    }

    public static getInstance(): TypeSearch {
        if (!TypeSearch.instance) {
            TypeSearch.instance = new TypeSearch();
        }
        return TypeSearch.instance;
    }

    /**
     * 扫描整个工作区的Python文件
     * 收集所有的类定义和导入信息
     */
    public async scanWorkspace() {
        const pythonFiles = await vscode.workspace.findFiles('**/*.py');

        for (const file of pythonFiles) {
            const content = await this.readFile(file);
            this.parseFileContent(content, file.fsPath);
        }
    }

    /**
     * 读取文件内容
     * @param uri 文件URI
     * @returns 文件内容字符串
     */
    private async readFile(uri: vscode.Uri): Promise<string> {
        const document = await vscode.workspace.openTextDocument(uri);
        return document.getText();
    }

    /**
     * 解析文件内容，提取类定义和导入语句
     * @param content 文件内容
     * @param filePath 文件路径
     */
    private parseFileContent(content: string, filePath: string) {
        const tree = this.astService.parseCode(content);
        this.cacheService.cacheTree(filePath, tree);

        const typeAnalyzer = new TypeAnalyzer(this.astService);

        // 处理类定义
        const classNodes = this.astService.findAllClassDefinitions();
        for (const node of classNodes) {
            const nameNode = node.children.find(child => child.type === 'identifier');
            if (nameNode) {
                this.searchedTypes.addLocalClass(nameNode.text, filePath);
            }
        }

        // 处理导入语句
        const importedClasses = typeAnalyzer.analyzeImports();
        for (const { className } of importedClasses) {
            this.searchedTypes.addImportedClass(className, filePath);
        }
    }

    /**
     * 监听工作区文件变化
     * 实时更新类定义和导入信息
     */
    public watchWorkspace() {
        const watcher = vscode.workspace.createFileSystemWatcher('**/*.py');

        watcher.onDidChange(async (uri) => {
            const content = await this.readFile(uri);
            this.parseFileContent(content, uri.fsPath);
        });

        watcher.onDidCreate(async (uri) => {
            const content = await this.readFile(uri);
            this.parseFileContent(content, uri.fsPath);
        });

        watcher.onDidDelete((uri) => {
            this.cacheService.clearCache(uri.fsPath);
            this.searchedTypes.removeFileClasses(uri.fsPath);
        });
    }
}
