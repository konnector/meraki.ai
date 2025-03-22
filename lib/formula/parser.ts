// Token types for formula lexer
export enum TokenType {
  Number,
  String,
  CellReference,
  Range,
  Operator,
  Function,
  LeftParen,
  RightParen,
  Comma,
  Colon,
  Equals,
  EOF
}

// Represents a token in the formula
export interface Token {
  type: TokenType;
  value: string;
  position: number;
}

// AST node types
export enum NodeType {
  Number,
  String,
  CellReference,
  Range,
  BinaryOperation,
  FunctionCall,
  Error
}

// Base AST node interface
export interface ASTNode {
  type: NodeType;
}

// Node for number literals
export interface NumberNode extends ASTNode {
  type: NodeType.Number;
  value: number;
}

// Node for string literals
export interface StringNode extends ASTNode {
  type: NodeType.String;
  value: string;
}

// Node for cell references like A1, $B$2
export interface CellReferenceNode extends ASTNode {
  type: NodeType.CellReference;
  reference: string;
  column: string;
  row: number;
  isAbsoluteColumn: boolean;
  isAbsoluteRow: boolean;
}

// Node for cell ranges like A1:B5
export interface RangeNode extends ASTNode {
  type: NodeType.Range;
  start: CellReferenceNode;
  end: CellReferenceNode;
}

// Node for binary operations (+, -, *, /, ^, %)
export interface BinaryOperationNode extends ASTNode {
  type: NodeType.BinaryOperation;
  operator: string;
  left: ASTNode;
  right: ASTNode;
}

// Node for function calls like SUM(A1:B5)
export interface FunctionCallNode extends ASTNode {
  type: NodeType.FunctionCall;
  name: string;
  arguments: ASTNode[];
}

// Node for formula errors
export interface ErrorNode extends ASTNode {
  type: NodeType.Error;
  message: string;
}

/**
 * Lexer class to convert formula string into tokens
 */
export class FormulaLexer {
  private formula: string;
  private position: number = 0;
  private currentChar: string | null = null;

  constructor(formula: string) {
    this.formula = formula.trim();
    
    // Skip the initial equals sign if present
    if (this.formula.startsWith('=')) {
      this.formula = this.formula.substring(1);
    }
    
    this.currentChar = this.formula.length > 0 ? this.formula[0] : null;
  }

  private advance(): void {
    this.position++;
    this.currentChar = this.position < this.formula.length ? this.formula[this.position] : null;
  }

  private skipWhitespace(): void {
    while (this.currentChar !== null && /\s/.test(this.currentChar)) {
      this.advance();
    }
  }

  private number(): Token {
    const startPos = this.position;
    let result = '';

    // Collect digits before decimal point
    while (this.currentChar !== null && /\d/.test(this.currentChar)) {
      result += this.currentChar;
      this.advance();
    }

    // Handle decimal point and digits after it
    if (this.currentChar === '.') {
      result += '.';
      this.advance();

      while (this.currentChar !== null && /\d/.test(this.currentChar)) {
        result += this.currentChar;
        this.advance();
      }
    }

    return {
      type: TokenType.Number,
      value: result,
      position: startPos
    };
  }

  private string(): Token {
    const startPos = this.position;
    let result = '';
    
    // Skip the opening quote
    this.advance();

    // Collect all characters until closing quote
    while (this.currentChar !== null && this.currentChar !== '"') {
      result += this.currentChar;
      this.advance();
    }

    // Skip the closing quote
    if (this.currentChar === '"') {
      this.advance();
    }

    return {
      type: TokenType.String,
      value: result,
      position: startPos
    };
  }

  private identifier(): Token {
    const startPos = this.position;
    let result = '';

    // Collect letters, numbers, and underscores
    while (
      this.currentChar !== null && 
      (/[a-zA-Z0-9_]/.test(this.currentChar) || this.currentChar === '$')
    ) {
      result += this.currentChar;
      this.advance();
    }

    // Check if this is a cell reference (like A1, $B$2)
    const cellRefRegex = /^\$?[A-Za-z]+\$?\d+$/;
    if (cellRefRegex.test(result)) {
      return {
        type: TokenType.CellReference,
        value: result,
        position: startPos
      };
    }

    // Otherwise, it's a function name
    return {
      type: TokenType.Function,
      value: result.toUpperCase(),
      position: startPos
    };
  }

  public getNextToken(): Token {
    // Skip whitespace
    this.skipWhitespace();

    if (this.currentChar === null) {
      return { type: TokenType.EOF, value: '', position: this.position };
    }

    // Handle numbers
    if (/\d/.test(this.currentChar)) {
      return this.number();
    }

    // Handle strings
    if (this.currentChar === '"') {
      return this.string();
    }

    // Handle cell references and function names
    if (/[A-Za-z$]/.test(this.currentChar)) {
      return this.identifier();
    }

    // Handle operators and other symbols
    switch (this.currentChar) {
      case '+':
        this.advance();
        return { type: TokenType.Operator, value: '+', position: this.position - 1 };
      case '-':
        this.advance();
        return { type: TokenType.Operator, value: '-', position: this.position - 1 };
      case '*':
        this.advance();
        return { type: TokenType.Operator, value: '*', position: this.position - 1 };
      case '/':
        this.advance();
        return { type: TokenType.Operator, value: '/', position: this.position - 1 };
      case '^':
        this.advance();
        return { type: TokenType.Operator, value: '^', position: this.position - 1 };
      case '%':
        this.advance();
        return { type: TokenType.Operator, value: '%', position: this.position - 1 };
      case '(':
        this.advance();
        return { type: TokenType.LeftParen, value: '(', position: this.position - 1 };
      case ')':
        this.advance();
        return { type: TokenType.RightParen, value: ')', position: this.position - 1 };
      case ',':
        this.advance();
        return { type: TokenType.Comma, value: ',', position: this.position - 1 };
      case ':':
        this.advance();
        return { type: TokenType.Colon, value: ':', position: this.position - 1 };
      case '=':
        this.advance();
        return { type: TokenType.Equals, value: '=', position: this.position - 1 };
      default:
        // Unexpected character
        const char = this.currentChar;
        this.advance();
        return { type: TokenType.Operator, value: char, position: this.position - 1 };
    }
  }

  public tokenize(): Token[] {
    const tokens: Token[] = [];
    let token = this.getNextToken();
    
    while (token.type !== TokenType.EOF) {
      tokens.push(token);
      token = this.getNextToken();
    }
    
    tokens.push(token); // Add the EOF token
    return tokens;
  }
}

/**
 * Parser class to convert tokens into an Abstract Syntax Tree (AST)
 */
export class FormulaParser {
  private tokens: Token[];
  private currentTokenIndex: number = 0;
  private currentToken: Token;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
    this.currentToken = this.tokens[0];
  }

  private consume(tokenType: TokenType): void {
    if (this.currentToken.type === tokenType) {
      this.currentTokenIndex++;
      if (this.currentTokenIndex < this.tokens.length) {
        this.currentToken = this.tokens[this.currentTokenIndex];
      }
    } else {
      throw new Error(`Expected token type ${TokenType[tokenType]} but got ${TokenType[this.currentToken.type]}`);
    }
  }

  private factor(): ASTNode {
    const token = this.currentToken;

    switch (token.type) {
      case TokenType.Number:
        this.consume(TokenType.Number);
        return {
          type: NodeType.Number,
          value: parseFloat(token.value)
        } as NumberNode;

      case TokenType.String:
        this.consume(TokenType.String);
        return {
          type: NodeType.String,
          value: token.value
        } as StringNode;

      case TokenType.CellReference:
        this.consume(TokenType.CellReference);
        
        // Parse cell reference (e.g., A1, $B$2)
        const reference = token.value;
        const isAbsoluteCol = reference.startsWith('$');
        
        // Find the transition from column to row
        let colEndIndex = 0;
        for (let i = isAbsoluteCol ? 1 : 0; i < reference.length; i++) {
          if (/\d/.test(reference[i]) || reference[i] === '$') {
            colEndIndex = i;
            break;
          }
        }
        
        const column = isAbsoluteCol ? reference.substring(1, colEndIndex) : reference.substring(0, colEndIndex);
        
        // Check if the row reference is absolute
        const remainingPart = reference.substring(colEndIndex);
        const isAbsoluteRow = remainingPart.startsWith('$');
        
        // Extract the row number
        const row = parseInt(isAbsoluteRow ? remainingPart.substring(1) : remainingPart, 10);
        
        const cellRef: CellReferenceNode = {
          type: NodeType.CellReference,
          reference: token.value,
          column,
          row,
          isAbsoluteColumn: isAbsoluteCol,
          isAbsoluteRow
        };
        
        // Check if this is the start of a range
        if (this.currentToken.type === TokenType.Colon) {
          this.consume(TokenType.Colon);
          
          // The next token should be another cell reference
          if (this.currentToken.type !== TokenType.CellReference) {
            throw new Error('Expected cell reference after colon in range');
          }
          
          // Parse the end of the range
          const endCellRef = this.factor() as CellReferenceNode;
          
          return {
            type: NodeType.Range,
            start: cellRef,
            end: endCellRef
          } as RangeNode;
        }
        
        return cellRef;

      case TokenType.Function:
        const funcName = token.value;
        this.consume(TokenType.Function);
        
        // Functions should be followed by left parenthesis
        if (this.currentToken.type !== TokenType.LeftParen) {
          throw new Error(`Expected ( after function name ${funcName}`);
        }
        this.consume(TokenType.LeftParen);
        
        // Parse function arguments
        const args: ASTNode[] = [];
        
        // Handle empty argument list
        if (this.currentToken.type === TokenType.RightParen) {
          this.consume(TokenType.RightParen);
          return {
            type: NodeType.FunctionCall,
            name: funcName,
            arguments: args
          } as FunctionCallNode;
        }
        
        // Parse first argument
        args.push(this.expression());
        
        // Parse remaining arguments
        while (this.currentToken.type === TokenType.Comma) {
          this.consume(TokenType.Comma);
          args.push(this.expression());
        }
        
        // Expect closing parenthesis
        if (this.currentToken.type !== TokenType.RightParen) {
          throw new Error('Expected ) at the end of function call');
        }
        this.consume(TokenType.RightParen);
        
        return {
          type: NodeType.FunctionCall,
          name: funcName,
          arguments: args
        } as FunctionCallNode;

      case TokenType.LeftParen:
        this.consume(TokenType.LeftParen);
        const expr = this.expression();
        
        if (this.currentToken.type !== TokenType.RightParen) {
          throw new Error('Expected )');
        }
        this.consume(TokenType.RightParen);
        
        return expr;

      default:
        return {
          type: NodeType.Error,
          message: `Unexpected token: ${token.value}`
        } as ErrorNode;
    }
  }

  private term(): ASTNode {
    let node = this.factor();

    while (
      this.currentToken.type === TokenType.Operator && 
      ['*', '/', '%'].includes(this.currentToken.value)
    ) {
      const operator = this.currentToken.value;
      this.consume(TokenType.Operator);
      
      node = {
        type: NodeType.BinaryOperation,
        operator,
        left: node,
        right: this.factor()
      } as BinaryOperationNode;
    }

    return node;
  }

  private expression(): ASTNode {
    let node = this.term();

    while (
      this.currentToken.type === TokenType.Operator && 
      ['+', '-'].includes(this.currentToken.value)
    ) {
      const operator = this.currentToken.value;
      this.consume(TokenType.Operator);
      
      node = {
        type: NodeType.BinaryOperation,
        operator,
        left: node,
        right: this.term()
      } as BinaryOperationNode;
    }

    return node;
  }

  /**
   * Parse a function call with arguments
   */
  private functionCall(): ASTNode {
    const token = this.tokens[this.currentTokenIndex - 1]; // Function name token
    const functionName = token.value;
    
    // Create a function call node
    const node: FunctionCallNode = {
      type: NodeType.FunctionCall,
      name: functionName.toUpperCase(), // Convert function name to uppercase to ensure case-insensitive matching
      arguments: []
    };
    
    // If there's no left parenthesis, return error
    if (this.currentToken.type !== TokenType.LeftParen) {
      return {
        type: NodeType.Error,
        message: `Expected '(' after function name ${functionName}`
      };
    }
    
    this.consume(TokenType.LeftParen);
    
    // Parse arguments (if any)
    if (this.currentToken.type !== TokenType.RightParen) {
      // Parse first argument
      node.arguments.push(this.expression());
      
      // Parse remaining arguments
      while (this.currentToken.type === TokenType.Comma) {
        this.consume(TokenType.Comma);
        node.arguments.push(this.expression());
      }
    }
    
    // Expect closing parenthesis
    if (this.currentToken.type !== TokenType.RightParen) {
      return {
        type: NodeType.Error,
        message: `Expected ')' to close function arguments for ${functionName}`
      };
    }
    
    this.consume(TokenType.RightParen);
    return node;
  }

  public parse(): ASTNode {
    try {
      return this.expression();
    } catch (error) {
      return {
        type: NodeType.Error,
        message: error instanceof Error ? error.message : 'Unknown parsing error'
      } as ErrorNode;
    }
  }
}

/**
 * Main function to parse a formula string into an AST
 */
export function parseFormula(formulaStr: string): ASTNode {
  try {
    const lexer = new FormulaLexer(formulaStr);
    const tokens = lexer.tokenize();
    const parser = new FormulaParser(tokens);
    return parser.parse();
  } catch (error) {
    return {
      type: NodeType.Error,
      message: error instanceof Error ? error.message : 'Unknown error parsing formula'
    } as ErrorNode;
  }
} 