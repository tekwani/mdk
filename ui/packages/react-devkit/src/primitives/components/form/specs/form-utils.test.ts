import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import {
  contactSchema,
  createConditionalRequired,
  createDateRange,
  createFieldNames,
  createPasswordMatch,
  loginSchema,
  profileSchema,
  registerSchema,
  validators,
} from '../form-utils'

describe('form Validators', () => {
  describe('validators.email', () => {
    it('should validate valid email addresses', () => {
      const schema = z.object({ email: validators.email() })
      expect(schema.safeParse({ email: 'test@example.com' }).success).toBe(true)
      expect(schema.safeParse({ email: 'user+tag@domain.co.uk' }).success).toBe(true)
    })

    it('should reject invalid email addresses', () => {
      const schema = z.object({ email: validators.email() })
      expect(schema.safeParse({ email: 'invalid' }).success).toBe(false)
      expect(schema.safeParse({ email: 'test@' }).success).toBe(false)
      expect(schema.safeParse({ email: '@example.com' }).success).toBe(false)
    })

    it('should handle optional emails', () => {
      const schema = z.object({ email: validators.email({ required: false }) })
      expect(schema.safeParse({ email: undefined }).success).toBe(true)
      expect(schema.safeParse({}).success).toBe(true)
    })
  })

  describe('validators.password', () => {
    it('should validate password with default length', () => {
      const schema = z.object({ password: validators.password() })
      expect(schema.safeParse({ password: 'password123' }).success).toBe(true)
      expect(schema.safeParse({ password: 'short' }).success).toBe(false)
    })

    it('should validate password with custom length', () => {
      const schema = z.object({ password: validators.password({ minLength: 12 }) })
      expect(schema.safeParse({ password: 'verylongpassword123' }).success).toBe(true)
      expect(schema.safeParse({ password: 'short' }).success).toBe(false)
    })
  })

  describe('validators.username', () => {
    it('should validate valid usernames', () => {
      const schema = z.object({ username: validators.username() })
      expect(schema.safeParse({ username: 'user123' }).success).toBe(true)
      expect(schema.safeParse({ username: 'test_user' }).success).toBe(true)
      expect(schema.safeParse({ username: 'user-name' }).success).toBe(true)
    })

    it('should reject invalid usernames', () => {
      const schema = z.object({ username: validators.username() })
      expect(schema.safeParse({ username: 'ab' }).success).toBe(false) // too short
      expect(schema.safeParse({ username: 'user name' }).success).toBe(false) // space
      expect(schema.safeParse({ username: 'user@name' }).success).toBe(false) // special char
    })
  })

  describe('validators.phone', () => {
    it('should validate valid phone numbers', () => {
      const schema = z.object({ phone: validators.phone() })
      expect(schema.safeParse({ phone: '+1234567890' }).success).toBe(true)
      expect(schema.safeParse({ phone: '1234567890' }).success).toBe(true)
      expect(schema.safeParse({ phone: '+1-234-567-8900' }).success).toBe(true)
    })

    it('should reject invalid phone numbers', () => {
      const schema = z.object({ phone: validators.phone() })
      expect(schema.safeParse({ phone: 'abc' }).success).toBe(false)
      expect(schema.safeParse({ phone: '123' }).success).toBe(false)
    })
  })

  describe('validators.macAddress', () => {
    it('should validate valid MAC addresses', () => {
      const schema = z.object({ mac: validators.macAddress() })
      expect(schema.safeParse({ mac: '00:11:22:33:44:55' }).success).toBe(true)
      expect(schema.safeParse({ mac: 'AA:BB:CC:DD:EE:FF' }).success).toBe(true)
      expect(schema.safeParse({ mac: 'aa-bb-cc-dd-ee-ff' }).success).toBe(true)
    })

    it('should reject invalid MAC addresses', () => {
      const schema = z.object({ mac: validators.macAddress() })
      expect(schema.safeParse({ mac: '00:11:22:33:44' }).success).toBe(false) // too short
      expect(schema.safeParse({ mac: '00:11:22:33:44:GG' }).success).toBe(false) // invalid hex
    })
  })

  describe('validators.ipAddress', () => {
    it('should validate valid IPv4 addresses', () => {
      const schema = z.object({ ip: validators.ipAddress() })
      expect(schema.safeParse({ ip: '192.168.1.1' }).success).toBe(true)
      expect(schema.safeParse({ ip: '10.0.0.1' }).success).toBe(true)
      expect(schema.safeParse({ ip: '255.255.255.255' }).success).toBe(true)
    })

    it('should reject invalid IP addresses', () => {
      const schema = z.object({ ip: validators.ipAddress() })
      expect(schema.safeParse({ ip: '256.1.1.1' }).success).toBe(false) // out of range
      expect(schema.safeParse({ ip: '192.168.1' }).success).toBe(false) // incomplete
      expect(schema.safeParse({ ip: 'not-an-ip' }).success).toBe(false)
    })
  })
})

describe('form Validators: options', () => {
  const issue = (schema: z.ZodTypeAny, value: unknown): string | undefined => {
    const result = schema.safeParse(value)
    return result.success ? undefined : result.error.issues[0]?.message
  }

  it('url: required by default, optional when required is false, with a custom message', () => {
    expect(validators.url().safeParse('https://mdk.dev').success).toBe(true)
    expect(issue(validators.url(), 'nope')).toBe('Please enter a valid URL')
    expect(validators.url({ required: false }).safeParse(undefined).success).toBe(true)
    expect(issue(validators.url({ required: false, message: 'Bad link' }), 'nope')).toBe('Bad link')
  })

  it('requiredString: a custom minimum and an optional maximum length', () => {
    const schema = validators.requiredString({ minLength: 3, maxLength: 5 })
    expect(issue(schema, 'ab')).toBe('This field must be at least 3 characters')
    expect(issue(schema, 'abcdef')).toBe('This field must not exceed 5 characters')
    expect(schema.safeParse('abcd').success).toBe(true)
    expect(issue(validators.requiredString(), '')).toBe('This field must be at least 1 characters')
  })

  it('optionalString: unlimited by default, capped with maxLength', () => {
    expect(validators.optionalString().safeParse(undefined).success).toBe(true)
    expect(validators.optionalString().safeParse('x'.repeat(500)).success).toBe(true)
    expect(issue(validators.optionalString({ maxLength: 3 }), 'abcd')).toBe(
      'This field must not exceed 3 characters',
    )
  })

  it('number: optional bounds and a custom type message', () => {
    const schema = validators.number({ min: 1, max: 10, message: 'Enter a number' })
    expect(issue(schema, 0)).toBe('Value must be at least 1')
    expect(issue(schema, 11)).toBe('Value must not exceed 10')
    expect(issue(schema, 'five')).toBe('Enter a number')
    expect(validators.number().safeParse(-100).success).toBe(true)
  })

  it('date: required by default with bounds, optional when required is false', () => {
    const min = new Date(2026, 0, 1)
    const max = new Date(2026, 11, 31)
    const schema = validators.date({ min, max })
    expect(issue(schema, undefined)).toBe('Please select a date')
    expect(issue(schema, new Date(2025, 5, 1))).toMatch(/^Date must be after /)
    expect(issue(schema, new Date(2027, 5, 1))).toMatch(/^Date must be before /)
    expect(schema.safeParse(new Date(2026, 5, 1)).success).toBe(true)
    expect(validators.date({ required: false }).safeParse(undefined).success).toBe(true)
  })

  it('enum: the default and a custom required message', () => {
    expect(issue(validators.enum(['a', 'b']), undefined)).toBe('Please select a valid option')
    expect(issue(validators.enum(['a', 'b'], 'Pick one'), undefined)).toBe('Pick one')
    expect(validators.enum(['a', 'b']).safeParse('b').success).toBe(true)
  })

  it('requiredBoolean: a custom message', () => {
    expect(issue(validators.requiredBoolean('Accept the terms'), false)).toBe('Accept the terms')
  })

  it('macAddress and ipAddress: optional when required is false, with custom messages', () => {
    expect(validators.macAddress({ required: false }).safeParse(undefined).success).toBe(true)
    expect(issue(validators.macAddress({ required: false, message: 'Bad MAC' }), 'zz')).toBe(
      'Bad MAC',
    )
    expect(issue(validators.macAddress({ message: 'Bad MAC' }), 'zz')).toBe('Bad MAC')
    expect(validators.ipAddress({ required: false }).safeParse(undefined).success).toBe(true)
    expect(issue(validators.ipAddress({ required: false, message: 'Bad IP' }), '999.1.1.1')).toBe(
      'Bad IP',
    )
    expect(issue(validators.ipAddress({ message: 'Bad IP' }), '1.2.3')).toBe('Bad IP')
  })
})

describe('createDateRange: incomplete ranges', () => {
  it('passes when either date is missing, so the required check reports it instead', () => {
    const [check] = createDateRange('start', 'end')
    expect(check({ start: new Date(2026, 0, 1) })).toBe(true)
    expect(check({ end: new Date(2026, 0, 1) })).toBe(true)
    expect(check({ start: new Date(2026, 0, 2), end: new Date(2026, 0, 1) })).toBe(false)
  })
})

describe('type-safe Field Names', () => {
  it('should create type-safe field name accessor', () => {
    type FormValues = {
      email: string
      profile: {
        name: string
      }
    }

    const field = createFieldNames<FormValues>()

    expect(field('email')).toBe('email')
    expect(field('profile.name')).toBe('profile.name')
  })
})

describe('validation Helpers', () => {
  describe('createPasswordMatch', () => {
    it('should validate matching passwords', () => {
      const schema = z
        .object({
          password: z.string(),
          confirmPassword: z.string(),
        })
        .refine(...createPasswordMatch('password', 'confirmPassword'))

      expect(schema.safeParse({ password: 'test123', confirmPassword: 'test123' }).success).toBe(
        true,
      )
      expect(schema.safeParse({ password: 'test123', confirmPassword: 'different' }).success).toBe(
        false,
      )
    })
  })

  describe('createDateRange', () => {
    it('should validate date ranges', () => {
      const schema = z
        .object({
          startDate: z.date(),
          endDate: z.date(),
        })
        .refine(...createDateRange('startDate', 'endDate'))

      const start = new Date('2024-01-01')
      const end = new Date('2024-12-31')
      const invalidEnd = new Date('2023-12-31')

      expect(schema.safeParse({ startDate: start, endDate: end }).success).toBe(true)
      expect(schema.safeParse({ startDate: start, endDate: invalidEnd }).success).toBe(false)
    })
  })

  describe('createConditionalRequired', () => {
    it('should conditionally require fields', () => {
      const schema = z
        .object({
          type: z.enum(['email', 'phone']),
          email: z.string().optional(),
          phone: z.string().optional(),
        })
        .refine(...createConditionalRequired('type', 'email', 'email', 'Email is required'))
        .refine(...createConditionalRequired('type', 'phone', 'phone', 'Phone is required'))

      expect(schema.safeParse({ type: 'email', email: 'test@example.com' }).success).toBe(true)
      expect(schema.safeParse({ type: 'email', phone: '1234567890' }).success).toBe(false)
      expect(schema.safeParse({ type: 'phone', phone: '1234567890' }).success).toBe(true)
      expect(schema.safeParse({ type: 'phone', email: 'test@example.com' }).success).toBe(false)
    })
  })
})

describe('pre-built Schemas', () => {
  it('should validate login schema', () => {
    expect(
      loginSchema.safeParse({
        email: 'test@example.com',
        password: 'password123',
        rememberMe: false,
      }).success,
    ).toBe(true)

    expect(
      loginSchema.safeParse({
        email: 'invalid',
        password: 'short',
        rememberMe: false,
      }).success,
    ).toBe(false)
  })

  it('should validate register schema', () => {
    expect(
      registerSchema.safeParse({
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        confirmPassword: 'password123',
        terms: true,
      }).success,
    ).toBe(true)

    expect(
      registerSchema.safeParse({
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        confirmPassword: 'different',
        terms: true,
      }).success,
    ).toBe(false)
  })

  it('should validate profile schema', () => {
    expect(
      profileSchema.safeParse({
        username: 'testuser',
        email: 'test@example.com',
        bio: 'This is my bio',
        phone: '+1234567890',
        website: 'https://example.com',
      }).success,
    ).toBe(true)

    expect(
      profileSchema.safeParse({
        username: 'testuser',
        email: 'test@example.com',
      }).success,
    ).toBe(true)
  })

  it('should validate contact schema', () => {
    expect(
      contactSchema.safeParse({
        name: 'John Doe',
        email: 'john@example.com',
        subject: 'Test Subject',
        message: 'This is a test message with enough characters.',
      }).success,
    ).toBe(true)

    expect(
      contactSchema.safeParse({
        name: 'J',
        email: 'invalid',
        subject: 'Test',
        message: 'Short',
      }).success,
    ).toBe(false)
  })
})
