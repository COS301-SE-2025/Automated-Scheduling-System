//go:build unit

package sms

import (
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

// Mock HTTP client for testing
type MockHTTPClient struct {
	DoFunc func(req *http.Request) (*http.Response, error)
}

func (m *MockHTTPClient) Do(req *http.Request) (*http.Response, error) {
	return m.DoFunc(req)
}

func TestSendSMS_JSONMarshalling_Success(t *testing.T) {
	// Setup
	recipient := "+27123456789"
	message := "Test message"

	// Mock successful HTTP response
	mockClient := &MockHTTPClient{
		DoFunc: func(req *http.Request) (*http.Response, error) {
			// Verify the request was built correctly
			if req.Method != "GET" {
				t.Errorf("Expected GET method, got %s", req.Method)
			}

			// Verify URL contains the base API URL
			if !strings.Contains(req.URL.String(), "https://api.sendmode.co.za/httppost.aspx") {
				t.Errorf("Expected URL to contain sendmode API URL, got %s", req.URL.String())
			}

			// Verify URL parameters
			params := req.URL.Query()
			if params.Get("type") != "sendparam" {
				t.Errorf("Expected type=sendparam, got %s", params.Get("type"))
			}
			if params.Get("numto") != recipient {
				t.Errorf("Expected numto=%s, got %s", recipient, params.Get("numto"))
			}
			if params.Get("data1") != message {
				t.Errorf("Expected data1=%s, got %s", message, params.Get("data1"))
			}

			// Return mock success response (XML format like SendMode)
			return &http.Response{
				StatusCode: http.StatusOK,
				Body:       io.NopCloser(strings.NewReader(`<httppost_result><call_result><result>True</result><error></error></call_result></httppost_result>`)),
			}, nil
		},
	}

	// Execute
	err := SendSMSWithClient(recipient, message, mockClient)

	// Assert
	if err != nil {
		t.Errorf("Expected no error, got %v", err)
	}
}

func TestSendSMS_HTTPClient_Error(t *testing.T) {
	// Setup
	recipient := "+27123456789"
	message := "Test message"

	// Mock HTTP client that returns an error
	mockClient := &MockHTTPClient{
		DoFunc: func(req *http.Request) (*http.Response, error) {
			return nil, fmt.Errorf("network error")
		},
	}

	// Execute
	err := SendSMSWithClient(recipient, message, mockClient)

	// Assert
	if err == nil {
		t.Error("Expected an error, got nil")
	}

	if !strings.Contains(err.Error(), "Error sending request") {
		t.Errorf("Expected 'Error sending request' in error message, got %s", err.Error())
	}
}

func TestSendSMS_HTTP_BadResponse(t *testing.T) {
	// Setup
	recipient := "+27123456789"
	message := "Test message"

	// Mock HTTP client that returns a bad response
	mockClient := &MockHTTPClient{
		DoFunc: func(req *http.Request) (*http.Response, error) {
			return &http.Response{
				StatusCode: http.StatusBadRequest,
				Status:     "400 Bad Request",
				Body:       io.NopCloser(strings.NewReader(`<httppost_result><call_result><result>False</result><error>Invalid request</error></call_result></httppost_result>`)),
			}, nil
		},
	}

	// Execute
	err := SendSMSWithClient(recipient, message, mockClient)

	// Assert
	if err == nil {
		t.Error("Expected an error, got nil")
	}

	if !strings.Contains(err.Error(), "Failed to send SMS") {
		t.Errorf("Expected 'Failed to send SMS' in error message, got %s", err.Error())
	}
}

func TestSendSMS_URL_Creation_Error(t *testing.T) {
	// Setup - create a scenario that will fail URL creation
	recipient := "+27123456789"
	message := "Test message"

	// Mock HTTP client - shouldn't be called due to earlier error
	mockClient := &MockHTTPClient{
		DoFunc: func(req *http.Request) (*http.Response, error) {
			t.Error("HTTP client should not be called when request creation fails")
			return nil, nil
		},
	}

	// Set invalid API URL to trigger request creation error
	originalAPIURL := apiURL
	apiURL = "://invalid-url"
	defer func() { apiURL = originalAPIURL }()

	// Execute
	err := SendSMSWithClient(recipient, message, mockClient)

	// Assert
	if err == nil {
		t.Error("Expected an error, got nil")
	}

	if !strings.Contains(err.Error(), "Error creating request") {
		t.Errorf("Expected 'Error creating request' in error message, got %s", err.Error())
	}
}

func TestSendSMS_MultipleRecipients(t *testing.T) {
	// Setup - Test the main SendSMS function with multiple recipients
	recipients := []string{"+27123456789", "+27987654321"}
	message := "Test message"

	callCount := 0
	// Mock successful HTTP response
	mockClient := &MockHTTPClient{
		DoFunc: func(req *http.Request) (*http.Response, error) {
			callCount++

			// Verify URL parameters for each call
			params := req.URL.Query()
			expectedRecipient := recipients[callCount-1]

			if params.Get("numto") != expectedRecipient {
				t.Errorf("Call %d: Expected numto=%s, got %s", callCount, expectedRecipient, params.Get("numto"))
			}

			if params.Get("data1") != message {
				t.Errorf("Call %d: Expected data1=%s, got %s", callCount, message, params.Get("data1"))
			}

			return &http.Response{
				StatusCode: http.StatusOK,
				Body:       io.NopCloser(strings.NewReader(`<httppost_result><call_result><result>True</result><error></error></call_result></httppost_result>`)),
			}, nil
		},
	}

	// Replace the default HTTP client temporarily
	originalClient := DefaultHTTPClient
	DefaultHTTPClient = mockClient
	defer func() { DefaultHTTPClient = originalClient }()

	// Execute
	err := SendSMS(recipients, message)

	// Assert
	if err != nil {
		t.Errorf("Expected no error, got %v", err)
	}

	if callCount != len(recipients) {
		t.Errorf("Expected %d HTTP calls, got %d", len(recipients), callCount)
	}
}

func TestSendSMS_URL_Parameters(t *testing.T) {
	// Setup
	recipient := "+27123456789"
	message := "Test message with spaces & special chars!"

	// Mock HTTP client to verify URL parameters
	mockClient := &MockHTTPClient{
		DoFunc: func(req *http.Request) (*http.Response, error) {
			params := req.URL.Query()

			// Verify all required parameters are present and correct
			if params.Get("type") != "sendparam" {
				t.Errorf("Expected type=sendparam, got %s", params.Get("type"))
			}

			if params.Get("numto") != recipient {
				t.Errorf("Expected numto=%s, got %s", recipient, params.Get("numto"))
			}

			if params.Get("data1") != message {
				t.Errorf("Expected data1=%s, got %s", message, params.Get("data1"))
			}

			return &http.Response{
				StatusCode: http.StatusOK,
				Body:       io.NopCloser(strings.NewReader(`<httppost_result><call_result><result>True</result><error></error></call_result></httppost_result>`)),
			}, nil
		},
	}

	// Execute
	err := SendSMSWithClient(recipient, message, mockClient)

	// Assert
	if err != nil {
		t.Errorf("Expected no error, got %v", err)
	}
}

// Test the original function with httptest server
func TestSendSMS_Integration_WithTestServer(t *testing.T) {
	// Create test server
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Verify request
		if r.Method != "GET" {
			t.Errorf("Expected GET method, got %s", r.Method)
		}

		// Verify URL parameters
		params := r.URL.Query()
		if params.Get("type") != "sendparam" {
			t.Errorf("Expected type=sendparam, got %s", params.Get("type"))
		}

		if params.Get("data1") != "Integration test message" {
			t.Errorf("Expected data1='Integration test message', got %s", params.Get("data1"))
		}

		if params.Get("numto") != "+27123456789" {
			t.Errorf("Expected numto='+27123456789', got %s", params.Get("numto"))
		}

		// Return success response (SendMode XML format)
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`<httppost_result><call_result><result>True</result><error></error></call_result></httppost_result>`))
	}))
	defer server.Close()

	// Override API URL to use test server
	originalAPIURL := apiURL
	apiURL = server.URL
	defer func() { apiURL = originalAPIURL }()

	// Test the original function
	err := SendSMS([]string{"+27123456789"}, "Integration test message")

	if err != nil {
		t.Errorf("Expected no error, got %v", err)
	}
}
