class TokenReader {
    tokens: any[];
    position: number;
    stateStack: number[];
    constructor(tokens: any[]) {
        this.tokens = tokens; // store tokens for further use
        this.position = 0; // current position in token list
        this.stateStack = []; // state stack so that we can rollback if we do not match something.
    }

    // Push current state to the stack
    // this allows us to go back to this state
    // if we do not match anything
    pushState() {
        this.stateStack.push(this.position);
    }

    // Restore last pushed state
    // we will call this when we read as far
    // as we could but we didn't match what we need.
    restoreState() {
        this.position = this.popState() as number;
    }

    // Pops the last state from the list and returns it.
    // We will call this when we need to lose the 
    // last saved state when we matched something and we
    // do not need to go back.
    popState() {
        return this.stateStack.pop();
    }

    // Checks whether the current token is of a
    // specific type or not.
    isType(type: any) {
        return this.hasNext() && this.getType() === type;
    }

    // Returns the type of the current token.
    getType() {
        return this.get().type;
    }

    // Returns the value of the current token.
    getValue() {
        return this.get().value;
    }

    // Checks whether the value in the current token
    // matches.
    isValue(value: any) {
        return this.getValue() === value;
    }

    // Returns the token at the current position.
    get() {
        return this.tokens[this.position];
    }

    // Returns the very last token in the list.
    getLastToken() {
        return this.tokens[this.tokens.length - 1];
    }

    // Move to the next token in the position.
    next() {
        this.position++;
    }

    // Check and return whether there are more tokens to
    // consume.
    hasNext() {
        return this.position < this.tokens.length;
    }
}

const rule = (getChecks: any, onMatch: any) => (reader: any) => {
    // Run getChecks to get rule check for a reader.
    // We need this to be a function so that we 
    // can reorder the rules as we see fit otherwise
    // we run into problems with Javascript not letting
    // us to use constants before it is defined.
    const checkRule = getChecks();

    // Run the retrieved rule checks on the reader.
    const result = checkRule(reader);

    // If result is not null that means that we found
    // a match and we run onMatch function on the result
    // to allow the rule to transform the result into
    // value which is good enough for our interpreter.
    //
    // If a result is null, this rule was not matched.
    return result ? onMatch(result) : null;
};

const LineStatement = rule(
    () => either(ElseStatement, conditionStatement, IfExpressionStatement, AssignmentStatement, FunctionStatement),
    (expression: any) => expression // We do not need to anything with the result here
);

const parseTokens = (tokens: any[]) => {
    // Create a reader for our tokens.
    const reader = new TokenReader(tokens);

    const statements = [];

    while (reader.hasNext()) {
        // We parse grammar until we have a next token.
        const statement = LineStatement(reader);

        if (statement) {
            // Our statement was parsed successfully,
            // so we add it to the list of statements.
            statements.push(statement);
            continue;
        }

        // Something went wrong here, we couldn't parse our statement here
        // so our language needs to throw a syntax error.
        let token = reader.hasNext() ? reader.get() : reader.getLastToken();
        throw new Error(`Syntax error on ${token.line}:${token.character} for "${token.value}". Expected an assignment, function call or an if statement.`);
    }

    // Return the parsed statements
    return statements;
};

const conditionStatement = rule(
    () => exactly(Expression, Eol),
    ([expression]: [expression: any]) => ({ type: "condition", expression })
)

// IfExpressionStatement -> IfKeyword PStart Expression PEnd CodeBlock
const IfExpressionStatement = rule(
    () => exactly(IfKeyword, PStart, Expression, PEnd, CodeBlock),
    ([, , check, , statements]: [any, any, check: any, any, statements: any]) => ({ type: 'if', check, statements }) // We transform the result into an if statement
);

// CodeBlock -> BStart LineStatement* BEnd
const CodeBlock = rule(
    () => exactly(BStart, minOf(0, LineStatement), BEnd),
    ([, statements]: [any, statements: any]) => statements // We only take the statements from here at index 1.
);

// FunctionStatement -> FunctionExpression Eol
const FunctionStatement = rule(
    () => exactly(FunctionExpression, Eol),
    ([expression]: [expression: any]) => expression // We only take the result of FunctionExpression at index 0.
);

// FunctionExpression -> Name PStart FunctionParameters? PEnd
const FunctionExpression = rule(
    () => exactly(Name, PStart, optional(FunctionParameters, [] as any), PEnd),
    ([name, _, parameters]: [name: any, any, parameter: any]) => ({ // name is at index 0, parameters are at index 2
        type: 'function',
        name: name.value,
        parameters
    })
);

// FunctionParameters -> Expression (Comma Expression)*
const FunctionParameters = rule(
    () => exactly(Expression, minOf(0, exactly(Comma, Expression))),
    ([first, rest]: [first: any, rest: any]) => [first, ...rest.map(([_, parameter]: [any, parameter: any]) => parameter)] // We combine first parameters with all of the rest into one array.
);

// AssignmentStatement -> Name Equals Expression Eol
const AssignmentStatement = rule(
    () => exactly(Name, Equals, Expression, Eol),
    ([name, , expression]: [name: any, any, expression: any]) => ({
        type: 'assignment',
        name: name.value, // name at index 0
        expression // expression at index 2
    })
);

// We use this functions for all binary operations in the
// Expression rule because all of them parse the same way
// this will allow us to create nested operations.
const processBinaryResult = ([left, right]: [left: any, right: any]) => {
    let expression = left;

    // We need to go through all operators on the right side
    // because there can be 3 or more operators in an expression.
    for (const [operator, rightSide] of right) {

        // Each time we encounter an expression we put the
        // previous one in the left side.
        expression = {
            type: 'operation',
            operation: operator.value,
            left: expression,
            right: rightSide
        };
    }

    // Finally we return the expression structure.
    return expression;
};

// Expression -> EqualityTerm ((And | Or) EqualityTerm)*
const Expression = rule(
    () => either(exactly(EqualityTerm, minOf(0, exactly(either(And, Or, BitwiseAnd, BitwiseOr, BitwiseXor), EqualityTerm)))),
    processBinaryResult
);

// EqualityTerm -> RelationTerm ((DoubleEquals | NotEquals) RelationTerm)*
const EqualityTerm = rule(
    () => exactly(RelationTerm, minOf(0, exactly(either(DoubleEquals, NotEquals), RelationTerm))),
    processBinaryResult
);

// EqualityTerm -> AddSubTerm ((Less | Greater | LessEquals | GreaterEquals) AddSubTerm)*
const RelationTerm = rule(
    () => exactly(AddSubTerm, minOf(0, exactly(either(Less, Greater, LessEquals, GreaterEquals), AddSubTerm))),
    processBinaryResult
);

// AddSubTerm -> MulDivTerm ((Add | Subtract) MulDivTerm)*
const AddSubTerm = rule(
    () => exactly(UnaryTerm, minOf(0, exactly(either(Add, Subtract), UnaryTerm))),
    processBinaryResult
);

// UnaryTerm -> Not? Factor
const UnaryTerm = rule(
    () => exactly(optional(either(Not, BitwiseNot)), Factor),
    ([optional, value]: [optional: any, value: any]) => ({
        type: 'unary',
        optional,
        value
    })
);

// Factor -> GroupExpression | FunctionExpression | NumberExpression | VariableExpression | StringExpression
const Factor = rule(
    () => either(GroupExpression, FunctionExpression, NumberExpression, VariableExpression, StringExpression, KeywordExpression),
    (factor: any) => factor
);

// GroupExpression -> PStart Expression PEnd
const GroupExpression = rule(
    () => exactly(PStart, Expression, PEnd),
    ([, expression]: [any, expression: any]) => expression
);

// VariableExpression -> Name
// Remember this part? We said we will need it. This is why.
// We need a way to structure variable names, numbers and strings
// So we created an alias rule where we structure the result tokens.
const VariableExpression = rule(
    () => Name,
    (name: any) => ({
        type: 'variable',
        name: name.value
    })
);

// NumberExpression -> Number
const NumberExpression = rule(
    () => Number,
    (number: any) => ({
        type: 'number',
        value: number.value
    })
);

// StringExpression -> String
const StringExpression = rule(
    () => String,
    (string: any) => ({
        type: 'string',
        value: string.value
    })
);

const KeywordExpression = rule(
    () => either(TrueKeyword, FalseKeyword),
    (keyword: any) => {

        let value: any = '';

        switch (keyword.value) {
            case 'true': value = true; break;
            case 'false': value = false; break;
        }

        return {
            type: "keyword",
            value
        }

    }
);

const ElseStatement = rule(
    () => exactly(ElseKeyword, Eol),
    (keyword: any) => {

        return {
            type: "keyword",
            value: "else"
        }

    }
);

// Exactly is a function which returns a function
// which exactly runs each of the checks against
// a reader. If just one of the checks fail
// the whole function will return a null meaning
// that we couldn't match anything.
const exactly = (...checks: any) => (reader: any) => {
    // First we store the current position in the  
    // token list so that we can go back if we don't
    // match what we need.
    reader.pushState();

    const results = [];

    for (const check of checks) {

        const match = check(reader); // Run the check against the reader

        if (!match) {
            // Didn't get a match so we
            // restore the position in the token
            // and exit the function returning null, meaning no match.
            reader.restoreState();
            return null;
        }

        // We found a match so we add it to our
        // results list
        results.push(match);
    }

    // We drop the state we saved because we found all matches
    // by this point so we do not need the
    // saved state anymore.
    reader.popState();

    // We return the matched items
    // so that they can be transformed as needed.
    return results;
};

// Either returns a function which 
// runs against a reader and checks each
// of the passed checks and returns the first
// one which matches.
const either = (...checks: any) => (reader: any) => {
    for (const check of checks) {
        reader.pushState(); // Store the state so that we can go back if we do not match.

        const match = check(reader);
        if (match) {
            // We found a match here
            // so we remove the stored state
            // as we do not need it.
            reader.popState();

            return match; // We return the found match.
        }

        // We didn't find a match here so
        // we restore the reader to previous state
        // so that next check in line
        // can be checked on the same position.
        reader.restoreState();
    }

    // We didn't find anything at this point
    // so we return null.
    return null;
};

// Optional function returns a function which works on a
// token reader, runs a check and returns a value
// denoted by defaultValue if the check does not match.
// Returning a defaultValue other than a null allows optional
// to always return something even if the check fails
// thus making the check optional. :)
const optional = (check: any, defaultValue = { type: 'optional' }) => (reader: any) => {
    reader.pushState(); // we store the state before the check
    const result = check(reader);

    if (!result) {
        // Our check failed
        // so we restore the previous state
        reader.restoreState();
    } else {
        // we had a match so we
        // dont need to keep the stored state anymore
        reader.popState();
    }

    // Here we return the match or the default value
    // as long as default value is not null this would
    // make the result optional.
    return result ? result : defaultValue;
};

// minOf returns a function which works on a token
// reader which performs a check for a minimum amount
// up to infinity if a check fails for a minimum
// amount, null is returned, anything after a minimum
// is optional.
const minOf = (minAmount: number, check: any) => (reader: any) => {
    reader.pushState(); // first we store the current state.

    const results = [];

    let result = null;

    while (true) {
        // we run checks as many times
        // as we can in this loop.
        result = check(reader);

        if (!result) {
            if (results.length < minAmount) {
                // result was not found and we
                // didn't reach the minimum
                // amount so the matching is a failure
                // and we restore state before
                // return a null.
                reader.restoreState();
                return null;
            }

            // We didn't find a match 
            // so we do not need to be
            // in this loop anymore so we exit it.
            break;
        }

        results.push(result);
    }

    // We reached the end here so
    // we do not need the state anymore
    // so we remove it and return the results.
    reader.popState();
    return results;
};

// Token function returns a function
// which works on a token reader, 
// checks the type of the token and (if specified)
// a value of the token.
const token = (type: any, value: any = null) => (reader: any) => {
    // first we check if we have
    // a value set and value matches
    // in our token reader
    // if we didn't set a value parameter this 
    // variable is always true.
    let valueMatches = value ? reader.isValue(value) : true;

    if (reader.isType(type) && valueMatches) {
        // Our type is correct and value matches
        // so we return the matched token at this point.
        const result = reader.get();

        // this is also the only time we move to the
        // next token in the list, and it is because of this
        // that we need to push and pop the reader state
        // because if we do not go back on failures, we will not be
        // able to match everything correctly
        reader.next();

        // And finally we return the token result.
        return result;
    };

    // Here we didn't find a token we are looking for,
    // so we return a null.
    return null;
};

// Tokens
const Number = token('number');
const String = token('string');
const Name = token('name');
const Equals = token('operator', '=');
const PStart = token('parenStart');
const PEnd = token('parenEnd');
const BStart = token('codeBlockStart');
const BEnd = token('codeBlockEnd');
const Comma = token('comma');
const Eol = token('endOfLine');
const IfKeyword = token('keyword', 'if');
const TrueKeyword = token('keyword', 'true');
const FalseKeyword = token('keyword', 'false');
const And = token('operator', '&&');
const Or = token('operator', '||');
const DoubleEquals = token('operator', '==');
const NotEquals = token('operator', '!=');
const Less = token('operator', '<');
const Greater = token('operator', '>');
const LessEquals = token('operator', '<=');
const GreaterEquals = token('operator', '>=');
const Add = token('operator', '+');
const Subtract = token('operator', '-');
const Not = token('operator', '!');
const BitwiseAnd = token('operator', '&');
const BitwiseOr = token('operator', '|');
const BitwiseXor = token('operator', '^');
const BitwiseNot = token('operator', '~');
const LeftShift = token('operator', '<<');
const RightShift = token('operator', '>>');
const ElseKeyword = token('keyword', 'else');

export const Parser = parseTokens;