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
     * 解析单个Python文件
     * @param document 当前文档
     */
    public async parseDocument(document: vscode.TextDocument) {
        if (document.languageId !== 'python') {
            return;
        }

        const content = document.getText();
        this.parseFileContent(content, document.uri.fsPath);
    }

    /**
     * 解析文件内容,提取类定义和导入语句
     * @param content 文件内容
     * @param filePath 文件路径
     */
    private parseFileContent(content: string, filePath: string) {
        const tree = this.astService.parseCode(content);
        this.cacheService.cacheTree(filePath, tree);

        const typeAnalyzer = new TypeAnalyzer(this.astService);

        // #region 处理导入语句,支持别名 Bug
        const importedClasses = typeAnalyzer.analyzeImports() as ImportedClass[];
        for (const { className, alias } of importedClasses) {
            this.searchedTypes.addImportedClass(className, filePath, alias);
        }
        // #endregion

        // #region 处理协议类型 Done
        const protocols = typeAnalyzer.analyzeProtocols();
        for (const { name, methods } of protocols) {
            this.searchedTypes.addProtocol(name, methods, filePath);
        }
        // #endregion

        // #region 处理类定义 Done
        const classNodes = this.astService.findAllClassDefinitions();
        for (const node of classNodes) {
            // 检查是否是协议类型
            const isProtocol = this.astService.hasBaseClass(node, 'Protocol');

            // 如果不是协议类型,才处理为普通类
            if (!isProtocol) {
                const nameNode = node.children.find(child => child.type === 'identifier');
                if (nameNode) {
                    // 添加对继承的支持
                    const baseClasses = this.astService.getBaseClasses(node);
                    this.searchedTypes.addLocalClass(nameNode.text, filePath, baseClasses);
                }
            }
        }
        // #endregion

        // #region 处理类型别名、字面量类型和类型变量 Bug
        const typeAnalysis = typeAnalyzer.analyzeVariableTypes();

        // 处理类型别名
        for (const { name, originalType } of typeAnalysis.aliases) {
            this.searchedTypes.addTypeAlias(name, originalType, filePath);
        }

        // 处理字面量类型
        for (const { name, values } of typeAnalysis.literals) {
            this.searchedTypes.addLiteralType(name, values, filePath);
        }

        // 处理类型变量
        for (const { name, constraints } of typeAnalysis.typeVars) {
            const trimmedName = name.trim();
            if (!trimmedName || trimmedName === 'super') {
                continue;
            }
            this.searchedTypes.addTypeVar(trimmedName, constraints, filePath);
        }
        // #endregion
    }

    /**
     * 监听当前文档变化
     */
    public watchCurrentDocument() {
        return vscode.workspace.onDidChangeTextDocument(event => {
            const document = event.document;
            if (document.languageId === 'python') {
                // 先清除旧数据
                this.searchedTypes.removeAllFileData(document.uri.fsPath);
                // 重新解析
                this.parseDocument(document);
            }
        });
    }
}
