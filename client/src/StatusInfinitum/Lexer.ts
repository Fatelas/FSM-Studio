class CharacterReader {
    code: string;
    characterPosition: number;
    linePosition: number;
    position: number;

    constructor(code: string) {
        this.code = code; // store code which we will read through
        this.characterPosition = 0; // Current character in a line of code text
        this.linePosition = 0; // Current line in the code text
        this.position = 0; // Current character in the code string.
    }

    // Return the number of characters specified by `amount`
    // without advancing the character reader.
    peek(amount = 1) {
        return this.code.substring(this.position, this.position + amount);
    }

    // Advance the character reader by specified amount
    next(amount = 1) {
        // we need a loop to go through all of the characters
        // by the specified amount so that we can properly
        // determine when a new line happened so that we
        // can keep proper line and character position.
        for (let i = this.position; i < this.position + amount; i++) {
            if (this.code[i] == '\n') { // If a new line character is detected
                this.linePosition++; // Increase line position
                this.characterPosition = 0; // Reset character position as it is a new line.
                continue;
            }

            this.characterPosition++; // Increase character position for the line.
        }

        this.position += amount; // Change current reader position in code string.
    }

    // Getter to just return current character position in the line in the code.
    getCharacterPosition() {
        return this.characterPosition;
    }

    // Getter to return current line position in the code
    getLinePosition() {
        return this.linePosition;
    }

    // Check and return whether there is more code to parse.
    hasNext() {
        return this.position < this.code.length;
    }
};

const readNumberToken = (reader: CharacterReader) => {
    let numberText = '';
    const numberMatch = /\d/; // Regex for detecing a digit.
    const binMath = /[01]/;
    const hexMatch = /[a-fA-F0-9]/;

    if (reader.peek(2).match(/0b/i)) {

        reader.next(2);

        while (reader.hasNext()) {
            if (reader.peek().match(binMath)) {
                // If a number matches the regex we add the
                // character to our string
                numberText += reader.peek();
                reader.next();
            } else {
                // if the number is not matched we do not need to search anymore.
                break;
            }

        }

        if (numberText.length == 0) {
            // if no number was detected, return null meaning no token detected.
            return null;
        }

        // We found the token and we return type and value of the token.
        return { type: 'number', value: parseInt(numberText, 2) };

    } else if (reader.peek(2).match(/0x/i)) {

        reader.next(2);

        while (reader.hasNext()) {
            if (reader.peek().match(hexMatch)) {
                // If a number matches the regex we add the
                // character to our string
                numberText += reader.peek();
                reader.next();
            } else {
                // if the number is not matched we do not need to search anymore.
                break;
            }

        }

        if (numberText.length == 0) {
            // if no number was detected, return null meaning no token detected.
            return null;
        }

        // We found the token and we return type and value of the token.
        return { type: 'number', value: parseInt(numberText, 16) };

    } else {

        // We read until we characters to read.
        while (reader.hasNext()) {
            if (reader.peek().match(numberMatch)) {
                // If a number matches the regex we add the
                // character to our string
                numberText += reader.peek();
                reader.next();
            } else {
                // if the number is not matched we do not need to search anymore.
                break;
            }


        }

        if (numberText.length == 0) {
            // if no number was detected, return null meaning no token detected.
            return null;
        }

        // We found the token and we return type and value of the token.
        return { type: 'number', value: numberText };

    }
}

const readString = (reader: CharacterReader) => {
    let value = '';
    let startedReading = false; // Flag if we started reading a string
    let isEscaping = false; // Flag if we need to ignore the next character.

    // We read until we characters to read.
    while (reader.hasNext()) {
        const matchFound = reader.peek() == "'";

        // if we didnt start reading the string and the string character didnt match
        // this means that we didn't encounter a string.
        if (!startedReading && !matchFound) {
            break;
        }

        // This allow us to have a ' character inside
        // our strings as long as we escape it.
        if (reader.peek() == '\\' && !isEscaping) {
            isEscaping = true;
            reader.next();
            continue; // we only consume this character and not add it to value.
        }

        // if we started reading and found a string character,
        // this means that we reached the end of string literal
        if (startedReading && matchFound && !isEscaping) {
            reader.next(); // move to a character after ' in the code.
            break;
        }

        // if we didn't start reading but we found a valid string start
        // we set the state for reading the string.
        if (!startedReading && matchFound) {
            startedReading = true;
            reader.next();
            continue;
        }

        // Add the character to our detected string.
        value += reader.peek();
        reader.next(); // Move the reader to a next character.
        isEscaping = false; // Reset escape flag so that we do not escape the next character.
    }

    if (value.length == 0) {
        return null; // if no string token was found
    }

    // return token of type string
    return { type: 'string', value };
}

const readOperator = (reader: CharacterReader) => {
    // Regex for operator characters we want to detect.
    const operatorMatch = /^(!|\+|-|==|!=|&&|\|\||<|>|<=|>=|=|!=|&|\||\^|~|<<|>>)$/;

    // Peek one character to detect one character operator
    const oneCharacterOperator = reader.peek();

    // Peek one character to detect two characters operator
    const twoCharacterOperator = reader.peek(2);

    let value = null;

    if (twoCharacterOperator.match(operatorMatch)) {
        reader.next(2);
        value = twoCharacterOperator; // two character operator was found
    } else if (oneCharacterOperator.match(operatorMatch)) {
        reader.next();
        value = oneCharacterOperator; // one character operator was found
    }

    if (value) {
        // Operator is found, we return the token.
        return { type: 'operator', value };
    }

    // Nothing was found so we return null that the token was not found.
    return null;
}

const readKeyword = (reader: CharacterReader) => {

    if (reader.peek(2).match(/^if$/i)) {
        // We detected if keywords and return the token.
        reader.next(2);
        return { type: 'keyword', value: 'if' };
    }

    if (reader.peek(4).match(/^true$/i)) {
        // We detected if keywords and return the token.
        reader.next(4);
        return { type: 'keyword', value: 'true' };
    }

    if (reader.peek(5).match(/^false$/i)) {
        // We detected if keywords and return the token.
        reader.next(5);
        return { type: 'keyword', value: 'false' };
    }

    if (reader.peek(4).match(/^else$/i)) {
        // We detected if keywords and return the token.
        reader.next(4);
        return { type: 'keyword', value: 'else' };
    }

    // No keyword detected
    return null;
}

const readName = (reader: CharacterReader) => {
    let value = '';
    const startOfVariableMatch = /[a-z]/;
    const restOfVariableMatch = /[a-zA-Z0-9]/;

    // If we did not match the variable, do not return a token.
    if (!reader.peek().match(startOfVariableMatch)) {
        return null;
    }

    value = reader.peek();
    reader.next();

    while (reader.hasNext() && reader.peek().match(restOfVariableMatch)) {
        // add a character to the value as long as we match the variable name.
        value += reader.peek();
        reader.next();
    }

    // we return a variable token
    return { type: 'name', value };
}

const readParentheses = (reader: CharacterReader) => {
    if (reader.peek() == '(') {
        // We detected '(', start of parentheses
        reader.next();
        return { type: 'parenStart', value: '(' };
    }

    if (reader.peek() == ')') {
        // We detected ')', end of parentheses
        reader.next();
        return { type: 'parenEnd', value: ')' };
    }

    // No token was detected.
    return null;
}

const readCodeBlocks = (reader: CharacterReader) => {
    if (reader.peek() == '{') {
        // We detected '{', start of code block
        reader.next();
        return { type: 'codeBlockStart' };
    }

    if (reader.peek() == '}') {
        // We detected '}', end of code block
        reader.next();
        return { type: 'codeBlockEnd' };
    }

    // No token was detected.
    return null;
}

const readEndOfLine = (reader: CharacterReader) => {
    if (reader.peek() == ';') {
        // Semicolon is detected
        reader.next();
        return { type: 'endOfLine', value: ';' };
    }

    // Semicolon is not detected
    return null;
}

const readComma = (reader: CharacterReader) => {
    if (reader.peek() == ',') {
        // Comma was detected
        reader.next();
        return { type: 'comma', value: ',' };
    }

    // Token was not detected.
    return null;
}

const readWhitespace = (reader: CharacterReader) => {
    const whitespaceRegex = /[\t\r\n ]/; // Regex for detecting whitespace.
    let value = '';
    while (reader.hasNext() && reader.peek().match(whitespaceRegex)) {
        // add detected whitespace to the value
        value += reader.peek();
        reader.next();
    }

    if (value.length > 0) {
        // Return detected whitespace.
        return { type: 'whitespace', value };
    }

    // No whitespace token was detected.
    return null;
}

const tokenDetectors =
    [
        readNumberToken,
        readString,
        readOperator,
        readKeyword,
        readName,
        readParentheses,
        readCodeBlocks,
        readEndOfLine,
        readComma,
        readWhitespace
    ];

const detectTokens = (code: string) => {
    // Create character reader for our code.
    const reader = new CharacterReader(code);

    // List of tokens we found in the code.
    const foundTokens = [];

    // We loop until we go through all of the characters.
    while (reader.hasNext()) {
        let token = null;

        // Store the positions in case we detect the token
        let startPosition = reader.position;
        let linePosition = reader.getLinePosition();
        let characterPosition = reader.getCharacterPosition();

        // We go through each of the token detectors
        // and call the function for detecting each token.
        for (const detectToken of tokenDetectors) {
            token = detectToken(reader);

            if (token) {
                // Token is detected so we do not
                // continue detection.
                break;
            }
        }

        // If no token could detect the character at this
        // position means that we have a syntax error in our
        // language so we should not continue.
        if (!token) {
            throw new Error(`Invalid character '${reader.peek()}' at ${linePosition}:${characterPosition}`);
        }

        // If a token is found we store the token data
        // together with the position information.
        foundTokens.push({
            ...token,
            start: startPosition,
            end: reader.position,
            line: linePosition,
            character: characterPosition
        });
    }

    // After we found all of the tokens we remove the whitespace
    // tokens because we will not use them.
    return foundTokens.filter(i => i.type !== 'whitespace');
};

export const Lexer = detectTokens;