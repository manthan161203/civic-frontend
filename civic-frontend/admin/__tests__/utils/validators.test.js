/**
 * Validator Tests
 * Tests for admin/src/utils/validators.js
 * @jest-environment jsdom
 */

import {
  validateForm,
  isFormValid,
  getFirstError,
  loginSchema,
  profileSchema,
  workerSchema,
  issueSchema,
  updateIssueSchema,
  announcementSchema,
} from '@/utils/validators';

describe('Form Validation Utilities', () => {

  describe('validateForm', () => {
    it('should validate correct login form', () => {
      const errors = validateForm({ phone: '+919876543210' }, loginSchema);
      expect(errors.phone).toBeNull();
    });

    it('should reject invalid phone', () => {
      const errors = validateForm({ phone: 'invalid' }, loginSchema);
      expect(errors.phone).not.toBeNull();
    });

    it('should validate worker data', () => {
      const validWorker = { name: 'John Doe', phone: '+919876543210', ward: 'ward_id' };
      const errors = validateForm(validWorker, workerSchema);
      expect(errors.name).toBeNull();
      expect(errors.phone).toBeNull();
      expect(errors.ward).toBeNull();
    });

    it('should validate issue creation', () => {
      const validIssue = {
        issue_type: 'roads',
        description: 'This is a valid issue description with enough characters',
        latitude: 21.1458,
        longitude: 79.0882,
      };
      const errors = validateForm(validIssue, issueSchema);
      expect(errors.issue_type).toBeNull();
      expect(errors.description).toBeNull();
    });

    it('should reject invalid coordinates', () => {
      const invalidIssue = {
        issue_type: 'roads',
        description: 'Valid description here',
        latitude: 91,
        longitude: 181,
      };
      const errors = validateForm(invalidIssue, issueSchema);
      expect(errors.latitude).not.toBeNull();
      expect(errors.longitude).not.toBeNull();
    });
  });

  describe('isFormValid', () => {
    it('should return true for no errors', () => {
      const errors = { phone: null, email: null };
      expect(isFormValid(errors)).toBe(true);
    });

    it('should return false if any error exists', () => {
      const errors = { phone: null, email: 'Invalid' };
      expect(isFormValid(errors)).toBe(false);
    });

    it('should handle empty object', () => {
      expect(isFormValid({})).toBe(true);
    });
  });

  describe('getFirstError', () => {
    it('should return first non-null error', () => {
      const errors = { name: null, phone: 'Invalid', email: 'Error' };
      expect(getFirstError(errors)).toBe('Invalid');
    });

    it('should return null if no errors', () => {
      const errors = { name: null, phone: null };
      expect(getFirstError(errors)).toBeNull();
    });
  });

  describe('loginSchema', () => {
    it('should validate phone', () => {
      expect(loginSchema.phone('+919876543210')).toBeNull();
      expect(loginSchema.phone('invalid')).not.toBeNull();
    });
  });

  describe('profileSchema', () => {
    it('should validate profile data', () => {
      expect(profileSchema.name('John Doe')).toBeNull();
      expect(profileSchema.phone('+919876543210')).toBeNull();
      expect(profileSchema.email('john@example.com')).toBeNull();
    });

    it('should reject short name', () => {
      expect(profileSchema.name('A')).not.toBeNull();
    });
  });

  describe('workerSchema', () => {
    it('should validate worker', () => {
      expect(workerSchema.name('Jane')).toBeNull();
      expect(workerSchema.ward('ward_123')).toBeNull();
    });

    it('should reject empty ward', () => {
      expect(workerSchema.ward('')).not.toBeNull();
    });
  });

  describe('issueSchema', () => {
    it('should validate issue type', () => {
      expect(issueSchema.issue_type('roads')).toBeNull();
      expect(issueSchema.issue_type('invalid')).not.toBeNull();
    });

    it('should validate coordinates', () => {
      expect(issueSchema.latitude(45.5)).toBeNull();
      expect(issueSchema.latitude(91)).not.toBeNull();
      expect(issueSchema.longitude(100)).toBeNull();
      expect(issueSchema.longitude(181)).not.toBeNull();
    });
  });

  describe('updateIssueSchema', () => {
    it('should validate status', () => {
      expect(updateIssueSchema.status('closed')).toBeNull();
      expect(updateIssueSchema.status('invalid')).not.toBeNull();
    });

    it('should allow null status', () => {
      expect(updateIssueSchema.status(null)).toBeNull();
    });
  });

  describe('announcementSchema', () => {
    it('should validate scope', () => {
      expect(announcementSchema.scope('state')).toBeNull();
      expect(announcementSchema.scope('invalid')).not.toBeNull();
    });
  });
});
