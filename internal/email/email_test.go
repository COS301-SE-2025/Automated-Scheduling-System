package email

import (
	"errors"
	"testing"

	gomail "gopkg.in/mail.v2"
)

// MockDialer is a mock implementation of gomail.Dialer
type MockDialer struct {
	ShouldFail bool
}

// Mock implementation of DialAndSend
func (m *MockDialer) DialAndSend(msg ...*gomail.Message) error {
	if m.ShouldFail {
		return errors.New("mock error: failed to send email")
	}
	return nil
}

func TestSendEmailWithDialer_Success(t *testing.T) {
	// Mock environment variables
	fromAddress = "test@example.com"
	mailPassword = "password"

	// Mock the dialer
	mockDialer := &MockDialer{ShouldFail: false}

	// Call the helper function
	err := SendEmailWithDialer(mockDialer, "recipient@example.com", "Test Subject", "Test Body")
	if err != nil {
		t.Errorf("expected no error, got %v", err)
	}
}

func TestSendEmailWithDialer_Failure(t *testing.T) {
	// Mock environment variables
	fromAddress = "test@example.com"
	mailPassword = "password"

	// Mock the dialer
	mockDialer := &MockDialer{ShouldFail: true}

	// Call the helper function
	err := SendEmailWithDialer(mockDialer, "recipient@example.com", "Test Subject", "Test Body")
	if err == nil {
		t.Errorf("expected error, got nil")
	}
}
