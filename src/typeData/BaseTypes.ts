// 定义模块名称的正则表达式模式
export const moduleName: string = '^[a-zA-Z_][a-zA-Z0-9_.]*$';

// 定义触发类型提示的字符
export const paramHintTrigger: string = ':'; // 参数类型提示触发字符
export const returnHintTrigger: string = '>'; // 返回值类型提示触发字符
export const variableHintTrigger: string = ':'; // 变量类型提示触发字符

// Python内置类型的枚举
export enum BuiltinTypes {
    bool = 'bool',
    bytes = 'bytes',
    complex = 'complex',
    dict = 'dict',
    float = 'float',
    int = 'int',
    list = 'list',
    object = 'object',
    set = 'set',
    str = 'str',
    tuple = 'tuple',
}

// typing库类型的枚举
export enum TypingTypes {
    // ===== 可细化类型 =====

    // 1. 容器类型
    Dict = 'Dict',
    List = 'List',
    Set = 'Set',
    Tuple = 'Tuple',

    // 2. 可迭代类型
    Iterable = 'Iterable',
    Iterator = 'Iterator',
    AsyncIterator = 'AsyncIterator',
    AsyncIterable = 'AsyncIterable',
    Generator = 'Generator',
    AsyncGenerator = 'AsyncGenerator',

    // 3. 泛型和类型组合
    Optional = 'Optional',
    Union = 'Union',
    Annotated = 'Annotated',
    Callable = 'Callable',

    // 4. 映射和序列相关
    Mapping = 'Mapping',
    MutableMapping = 'MutableMapping',
    Sequence = 'Sequence',
    MutableSequence = 'MutableSequence',
    AbstractSet = 'AbstractSet',
    MutableSet = 'MutableSet',
    Container = 'Container',
    Collection = 'Collection',

    // 5. 视图类型
    ItemsView = 'ItemsView',
    KeysView = 'KeysView',
    ValuesView = 'ValuesView',

    // 6. 异步和协程
    Awaitable = 'Awaitable',
    Coroutine = 'Coroutine',

    // 7. IO相关
    IO = 'IO',

    // ===== 不可细化类型 =====

    // 1. 特殊类型标记
    Any = 'Any',
    Never = 'Never',
    NoReturn = 'NoReturn',
    ClassVar = 'ClassVar',
    Final = 'Final',
    Self = 'Self',

    // 2. 类型系统工具
    TypeVar = 'TypeVar',
    TypeVarTuple = 'TypeVarTuple',
    ParamSpec = 'ParamSpec',
    TypeAlias = 'TypeAlias',
    TypeGuard = 'TypeGuard',
    Generic = 'Generic',
    Protocol = 'Protocol',

    // 3. 具体实现类型
    ChainMap = 'ChainMap',
    Counter = 'Counter',
    Deque = 'Deque',
    DefaultDict = 'DefaultDict',
    OrderedDict = 'OrderedDict',
    FrozenSet = 'FrozenSet',

    // 4. 支持协议类型
    SupportsAbs = 'SupportsAbs',
    SupportsBytes = 'SupportsBytes',
    SupportsComplex = 'SupportsComplex',
    SupportsFloat = 'SupportsFloat',
    SupportsIndex = 'SupportsIndex',
    SupportsInt = 'SupportsInt',
    SupportsRound = 'SupportsRound',

    // 5. 基础协议类型
    Sized = 'Sized',
    Hashable = 'Hashable',
    Reversible = 'Reversible',
    ByteString = 'ByteString',

    // 6. 上下文管理
    ContextManager = 'ContextManager',
    AsyncContextManager = 'AsyncContextManager',

    // 7. IO和模式匹配
    BinaryIO = 'BinaryIO',
    TextIO = 'TextIO',
    Match = 'Match',
    Pattern = 'Pattern',

    // 8. 工具类型
    AnyStr = 'AnyStr',
    LiteralString = 'LiteralString',
    Literal = 'Literal',
    Required = 'Required',
    NotRequired = 'NotRequired',
    Type = 'Type',
    Concatenate = 'Concatenate',
    MappingView = 'MappingView',
}

/**
 * Python类型的分类枚举
 * Refinable: 可细化类型(如list, dict等可以指定具体元素类型的类型)
 * NonRefinable: 不可细化类型(如int, str等基本类型)
 */
export enum TypeCategory {
    Refinable, // 可细化类型(如list, dict等可以指定具体元素类型的类型)
    NonRefinable, // 不可细化类型(如int, str等基本类型)
}

// builtIn类型名称到类型分类的映射
const builtInTypeCategories: { [key: string]: TypeCategory } = {
    bool: TypeCategory.NonRefinable,
    bytes: TypeCategory.NonRefinable,
    complex: TypeCategory.NonRefinable,
    dict: TypeCategory.Refinable,
    float: TypeCategory.NonRefinable,
    int: TypeCategory.NonRefinable,
    list: TypeCategory.Refinable,
    object: TypeCategory.NonRefinable,
    set: TypeCategory.Refinable,
    str: TypeCategory.NonRefinable,
    tuple: TypeCategory.Refinable,
};

// typing库类型名称到类型分类的映射
const typingTypeCategories: { [key: string]: TypeCategory } = {
    // ===== 可细化类型 =====

    // 1. 容器类型
    Dict: TypeCategory.Refinable,
    List: TypeCategory.Refinable,
    Set: TypeCategory.Refinable,
    Tuple: TypeCategory.Refinable,

    // 2. 可迭代类型
    Iterable: TypeCategory.Refinable,
    Iterator: TypeCategory.Refinable,
    AsyncIterator: TypeCategory.Refinable,
    AsyncIterable: TypeCategory.Refinable,
    Generator: TypeCategory.Refinable,
    AsyncGenerator: TypeCategory.Refinable,

    // 3. 泛型和类型组合
    Optional: TypeCategory.Refinable,
    Union: TypeCategory.Refinable,
    Annotated: TypeCategory.Refinable,
    Callable: TypeCategory.Refinable,

    // 4. 映射和序列相关
    Mapping: TypeCategory.Refinable,
    MutableMapping: TypeCategory.Refinable,
    Sequence: TypeCategory.Refinable,
    MutableSequence: TypeCategory.Refinable,
    AbstractSet: TypeCategory.Refinable,
    MutableSet: TypeCategory.Refinable,
    Container: TypeCategory.Refinable,
    Collection: TypeCategory.Refinable,

    // 5. 视图类型
    ItemsView: TypeCategory.Refinable,
    KeysView: TypeCategory.Refinable,
    ValuesView: TypeCategory.Refinable,

    // 6. 异步和协程
    Awaitable: TypeCategory.Refinable,
    Coroutine: TypeCategory.Refinable,

    // 7. IO相关
    IO: TypeCategory.Refinable,

    // ===== 不可细化类型 =====

    // 1. 特殊类型标记
    Any: TypeCategory.NonRefinable,
    Never: TypeCategory.NonRefinable,
    NoReturn: TypeCategory.NonRefinable,
    ClassVar: TypeCategory.NonRefinable,
    Final: TypeCategory.NonRefinable,
    Self: TypeCategory.NonRefinable,

    // 2. 类型系统工具
    TypeVar: TypeCategory.NonRefinable,
    TypeVarTuple: TypeCategory.NonRefinable,
    ParamSpec: TypeCategory.NonRefinable,
    TypeAlias: TypeCategory.NonRefinable,
    TypeGuard: TypeCategory.NonRefinable,
    Generic: TypeCategory.NonRefinable,
    Protocol: TypeCategory.NonRefinable,

    // 3. 具体实现类型
    ChainMap: TypeCategory.NonRefinable,
    Counter: TypeCategory.NonRefinable,
    Deque: TypeCategory.NonRefinable,
    DefaultDict: TypeCategory.NonRefinable,
    OrderedDict: TypeCategory.NonRefinable,
    FrozenSet: TypeCategory.NonRefinable,

    // 4. 支持协议类型
    SupportsAbs: TypeCategory.NonRefinable,
    SupportsBytes: TypeCategory.NonRefinable,
    SupportsComplex: TypeCategory.NonRefinable,
    SupportsFloat: TypeCategory.NonRefinable,
    SupportsIndex: TypeCategory.NonRefinable,
    SupportsInt: TypeCategory.NonRefinable,
    SupportsRound: TypeCategory.NonRefinable,

    // 5. 基础协议类型
    Sized: TypeCategory.NonRefinable,
    Hashable: TypeCategory.NonRefinable,
    Reversible: TypeCategory.NonRefinable,
    ByteString: TypeCategory.NonRefinable,

    // 6. 上下文管理
    ContextManager: TypeCategory.NonRefinable,
    AsyncContextManager: TypeCategory.NonRefinable,

    // 7. IO和模式匹配
    BinaryIO: TypeCategory.NonRefinable,
    TextIO: TypeCategory.NonRefinable,
    Match: TypeCategory.NonRefinable,
    Pattern: TypeCategory.NonRefinable,

    // 8. 工具类型
    AnyStr: TypeCategory.NonRefinable,
    LiteralString: TypeCategory.NonRefinable,
    Literal: TypeCategory.NonRefinable,
    Required: TypeCategory.NonRefinable,
    NotRequired: TypeCategory.NonRefinable,
    Type: TypeCategory.NonRefinable,
    Concatenate: TypeCategory.NonRefinable,
    MappingView: TypeCategory.NonRefinable,
};

/**
 * 表示Python类型的类
 * 包含类型名称和类型分类信息
 */
export class DataType {
    name: BuiltinTypes | TypingTypes; // 类型名称
    category: TypeCategory; // 类型分类

    constructor(name: BuiltinTypes | TypingTypes, category: TypeCategory) {
        this.name = name;
        this.category = category;
    }
}

// 类型容器接口，用于存储类型名称到DataType的映射
export interface DataTypeContainer {
    [key: string]: DataType;
}

/**
 * 获取包含所有内置Python类型的容器
 * @returns 类型容器对象
 */
export const getBuiltinType = (): DataTypeContainer => {
    const container: DataTypeContainer = {};

    // 添加内置类型
    Object.values(BuiltinTypes).forEach(typeName => {
        container[typeName] = new DataType(
            typeName as BuiltinTypes,
            builtInTypeCategories[typeName]
        );
    });

    return container;
};

/**
 * 获取包含所有typing模块类型的容器
 * @returns 类型容器对象
 */
export const getTypingType = (): DataTypeContainer => {
    const container: DataTypeContainer = {};

    // 添加 typing 库的类型
    Object.values(TypingTypes).forEach(typeName => {
        container[typeName] = new DataType(typeName as TypingTypes, typingTypeCategories[typeName]);
    });

    return container;
};

/**
 * 获取包含所有Python类型的容器
 * 包括内置类型和typing模块类型
 * @returns 类型容器对象
 */
export const getBaseType = (): DataTypeContainer => {
    return {
        ...getBuiltinType(),
        ...getTypingType(),
    };
};
