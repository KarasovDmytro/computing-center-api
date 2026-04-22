function ohce(input, name = 'Dmytro', currentHour = new Date().getHours()) {

    if (typeof input !== 'string')  
    {
        throw new TypeError('Вхідне значення має бути текстовим рядком.');
    }

    if (typeof currentHour !== 'number' || currentHour < 0 || currentHour > 23) 
    {
        throw new RangeError('Поточна година має бути числом у діапазоні від 0 до 23.');
    }
    
    let hello = '';

    const reversedInput = input.split('').reverse().join('');

    if (currentHour >= 20 || currentHour < 6) 
    {
        hello = `¡Buenas noches ${name}!`;
    }

    else if (currentHour >= 6 && currentHour < 12) 
    {
        hello = `¡Buenos días ${name}!`;
    } 
    
    else 
    {
        hello = `¡Buenas tardes ${name}!`;
    }

    let result = `${hello}\n${reversedInput}`;

    if (input === reversedInput && input.length > 0) 
    {
      result += '\n¡Bonita palabra!';
    }
  
    return result;
  }

  describe('ohce', () => {
    const myName = 'Dmytro';

    describe('ohce_MorningTime_ReturnsBuenosDias', () => {
        it('should return morning greeting when hour is between 6 and 12', () => {
            // Arrange
            const inputWord = 'test';
            const currentHour = 8;

            // Act
            const result = ohce(inputWord, myName, currentHour);

            // Assert
            expect(result).toContain(`¡Buenos días ${myName}!`);
            expect(result).toContain('tset');
        });
    });

    describe('ohce_AfternoonTime_ReturnsBuenasTardes', () => {
        it('should return afternoon greeting when hour is between 12 and 20', () => {
            // Arrange
            const inputWord = 'test';
            const currentHour = 15;

            // Act
            const result = ohce(inputWord, myName, currentHour);

            // Assert
            expect(result).toContain(`¡Buenas tardes ${myName}!`);
        });
    });

    describe('ohce_NightTime_ReturnsBuenasNoches', () => {
        it('should return night greeting when hour is past midnight', () => {
            // Arrange
            const inputWord = 'test';
            const currentHour = 3;

            // Act
            const result = ohce(inputWord, myName, currentHour);

            // Assert
            expect(result).toContain(`¡Buenas noches ${myName}!`);
        });
    });

    describe('ohce_StandardWordInput_ReturnsReversedWithoutCompliment', () => {
        it('should reverse the string and not append the palindrome compliment', () => {
            // Arrange
            const inputWord = 'backend';
            const currentHour = 10;

            // Act
            const result = ohce(inputWord, myName, currentHour);

            // Assert
            expect(result).toContain('dnekcab');
            expect(result).not.toContain('¡Bonita palabra!');
        });
    });

    describe('ohce_PalindromeInput_ReturnsCompliment', () => {
        it('should reverse the string and append the palindrome compliment', () => {
            // Arrange
            const inputWord = 'boob';
            const currentHour = 10;

            // Act
            const result = ohce(inputWord, myName, currentHour);

            // Assert
            expect(result).toContain('boob');
            expect(result).toContain('¡Bonita palabra!');
        });
    });

    describe('ohce_BoundaryConditions', () => {
        it('should return morning greeting when hour is exactly 6', () => {
            // Arrange
            const inputWord = 'test';
            const currentHour = 6;
    
            // Act
            const result = ohce(inputWord, 'Dmytro', currentHour);
    
            // Assert
            expect(result).toContain('¡Buenos días Dmytro!');
        });
    
        it('should return afternoon greeting when hour is exactly 12', () => {
            // Arrange
            const inputWord = 'test';
            const currentHour = 12;
    
            // Act
            const result = ohce(inputWord, 'Dmytro', currentHour);
    
            // Assert
            expect(result).toContain('¡Buenas tardes Dmytro!');
        });
    
        it('should return night greeting when hour is exactly 20', () => {
            // Arrange
            const inputWord = 'test';
            const currentHour = 20;
    
            // Act
            const result = ohce(inputWord, 'Dmytro', currentHour);
    
            // Assert
            expect(result).toContain('¡Buenas noches Dmytro!');
        });
    
        it('should handle empty string correctly', () => {
            // Arrange
            const inputWord = '';
            const currentHour = 10;
    
            // Act
            const result = ohce(inputWord, 'Dmytro', currentHour);
    
            // Assert
            expect(result).not.toContain('¡Bonita palabra!'); 
        });
    });
    
    describe('ohce_ErrorConditions', () => {
        it('should throw an error when input is null', () => {
            // Arrange
            const inputWord = null;
            const currentHour = 10;
    
            // Act & Assert
            expect(() => {
                ohce(inputWord, 'Dmytro', currentHour);
            }).toThrow();
        });
    
        it('should throw an error when input is not a string', () => {
            // Arrange
            const inputWord = 12345;
            const currentHour = 10;
    
            // Act & Assert
            expect(() => {
                ohce(inputWord, 'Dmytro', currentHour);
            }).toThrow();
        });
    
        it('should throw an error when hour is invalid (out of 0-23 range)', () => {
            // Arrange
            const inputWord = 'test';
            const currentHour = 25;
    
            // Act & Assert
            expect(() => {
                ohce(inputWord, 'Dmytro', currentHour);
            }).toThrow();
        });
    });
});