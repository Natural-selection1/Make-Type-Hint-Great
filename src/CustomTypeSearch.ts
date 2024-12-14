import * as vscode from 'vscode';
import { ASTService } from './services/ASTService';
import { CacheService } from './services/CacheService';
import CustomTypes from './typeData/CustomTypes';
import { TypeAnalyzer } from './services/TypeAnalyzer';

interface ImportedClass {
    className: string;
    source: string;
    alias?: string;
}

/**
 * TypeSearch类负责扫描和解析工作区中的Python文件，
 * 收集所有的类定义、导入信息、类型别名、类型变量、协议类型和字面量类型
 */
export class CustomTypeSearch {
    /** 单例模式实例 */
    private static instance: CustomTypeSearch;
    /** 用于存储搜索到的类型信息,包括类定义、类型别名、协议等 */
    private searchedTypes: CustomTypes;
    /** AST服务,用于解析和分析Python代码 */
    private astService: ASTService;
    /** 缓存服务,用于缓存AST树和类型信息 */
    private cacheService: CacheService;

    /** 私有构造函数,确保单例模式 */
    private constructor() {
        this.searchedTypes = CustomTypes.getInstance();
        this.astService = new ASTService();
        this.cacheService = new CacheService();
    }

    public static getInstance(): CustomTypeSearch {
        if (!CustomTypeSearch.instance) {
            CustomTypeSearch.instance = new CustomTypeSearch();
        }
        return CustomTypeSearch.instance;
    }

    /**
     * 扫描整个工作区的Python文件
     * 收集所有的类定义和导入信息
     */
    public async scanWorkspace() {
        console.log('Starting workspace scan for Python files...');
        const pythonFiles = await vscode.workspace.findFiles('**/*.py');
        console.log(`Found ${pythonFiles.length} Python files`);

        for (const file of pythonFiles) {
            console.log(`Processing file: ${file.fsPath}`);
            const content = await this.readFile(file);
            this.parseFileContent(content, file.fsPath);
        }
        console.log('Workspace scan completed');
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
     * 解析文件内容,提取类定义和导入语句
     * @param content 文件内容
     * @param filePath 文件路径
     */
    private parseFileContent(content: string, filePath: string) {
        console.log(`Parsing content for ${filePath}`);
        const tree = this.astService.parseCode(content);
        this.cacheService.cacheTree(filePath, tree);

        const typeAnalyzer = new TypeAnalyzer(this.astService);

        // 处理类定义
        const classNodes = this.astService.findAllClassDefinitions();
        console.log(`Found ${classNodes.length} class definitions in ${filePath}`);
        for (const node of classNodes) {
            const nameNode = node.children.find(child => child.type === 'identifier');
            if (nameNode) {
                // 添加对继承的支持
                const baseClasses = this.astService.getBaseClasses(node);
                this.searchedTypes.addLocalClass(nameNode.text, filePath, baseClasses);
            }
        }

        // 处理导入语句,支持别名
        const importedClasses = typeAnalyzer.analyzeImports() as ImportedClass[];
        for (const { className, alias } of importedClasses) {
            this.searchedTypes.addImportedClass(className, filePath, alias);
        }

        // 处理类型别名和NewType
        const typeAliases = typeAnalyzer.analyzeTypeAliases();
        for (const { name, originalType } of typeAliases) {
            this.searchedTypes.addTypeAlias(name, originalType, filePath);
        }

        // 处理类型变量
        const typeVars = typeAnalyzer.analyzeTypeVars();
        for (const { name, constraints } of typeVars) {
            this.searchedTypes.addTypeVar(name, constraints, filePath);
        }

        // 处理协议类型
        const protocols = typeAnalyzer.analyzeProtocols();
        for (const { name, methods } of protocols) {
            this.searchedTypes.addProtocol(name, methods, filePath);
        }

        // 处理字面量类型
        const literals = typeAnalyzer.analyzeLiteralTypes();
        for (const { name, values } of literals) {
            this.searchedTypes.addLiteralType(name, values, filePath);
        }
    }

    /**
     * 监听工作区文件变化
     * 实时更新类定义和导入信息
     */
    public watchWorkspace() {
        const watcher = vscode.workspace.createFileSystemWatcher('**/*.py');

        watcher.onDidChange(async uri => {
            const content = await this.readFile(uri);
            // 先清除旧数据
            this.searchedTypes.removeAllFileData(uri.fsPath);
            // 重新解析
            this.parseFileContent(content, uri.fsPath);
        });

        watcher.onDidCreate(async uri => {
            const content = await this.readFile(uri);
            this.parseFileContent(content, uri.fsPath);
        });

        watcher.onDidDelete(uri => {
            this.cacheService.clearCache(uri.fsPath);
            this.searchedTypes.removeAllFileData(uri.fsPath);
        });
    }
}
