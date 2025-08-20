//go:build unit

package sms

import (
	"encoding/json"
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
	recipients := []string{"+27123456789", "+27987654321"}
	message := "Test message"

	// Mock successful HTTP response
	mockClient := &MockHTTPClient{
		DoFunc: func(req *http.Request) (*http.Response, error) {
			// Verify the request was built correctly
			if req.Method != "POST" {
				t.Errorf("Expected POST method, got %s", req.Method)
			}

			if req.URL.String() != apiURL {
				t.Errorf("Expected URL %s, got %s", apiURL, req.URL.String())
			}

			// Verify headers
			if req.Header.Get("Content-Type") != "application/json" {
				t.Errorf("Expected Content-Type application/json, got %s", req.Header.Get("Content-Type"))
			}

			// Verify JSON payload
			body, err := io.ReadAll(req.Body)
			if err != nil {
				t.Fatalf("Failed to read request body: %v", err)
			}

			var payload map[string]interface{}
			if err := json.Unmarshal(body, &payload); err != nil {
				t.Fatalf("Failed to unmarshal JSON: %v", err)
			}

			// Verify payload structure
			messageData, ok := payload["message"].(map[string]interface{})
			if !ok {
				t.Error("Expected 'message' field in payload")
			}

			if messageData["messagetext"] != message {
				t.Errorf("Expected message text %s, got %s", message, messageData["messagetext"])
			}

			if messageData["senderid"] != "DISCON Automated Scheduling System" {
				t.Errorf("Expected correct sender ID, got %s", messageData["senderid"])
			}

			// Verify recipients
			recipientsData, ok := messageData["recipients"].([]interface{})
			if !ok {
				t.Error("Expected 'recipients' to be an array")
			}

			if len(recipientsData) != len(recipients) {
				t.Errorf("Expected %d recipients, got %d", len(recipients), len(recipientsData))
			}

			// Return mock success response
			return &http.Response{
				StatusCode: http.StatusOK,
				Body:       io.NopCloser(strings.NewReader(`{"status": "success"}`)),
			}, nil
		},
	}

	// Set API key for test
	originalAPIKey := apiKey
	apiKey = "test-api-key"
	defer func() { apiKey = originalAPIKey }()

	// Execute
	err := SendSMSWithClient(recipients, message, mockClient)

	// Assert
	if err != nil {
		t.Errorf("Expected no error, got %v", err)
	}
}

func TestSendSMS_HTTPClient_Error(t *testing.T) {
	// Setup
	recipients := []string{"+27123456789"}
	message := "Test message"

	// Mock HTTP client that returns an error
	mockClient := &MockHTTPClient{
		DoFunc: func(req *http.Request) (*http.Response, error) {
			return nil, fmt.Errorf("network error")
		},
	}

	// Set API key for test
	originalAPIKey := apiKey
	apiKey = "test-api-key"
	defer func() { apiKey = originalAPIKey }()

	// Execute
	err := SendSMSWithClient(recipients, message, mockClient)

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
	recipients := []string{"+27123456789"}
	message := "Test message"

	// Mock HTTP client that returns a bad response
	mockClient := &MockHTTPClient{
		DoFunc: func(req *http.Request) (*http.Response, error) {
			return &http.Response{
				StatusCode: http.StatusBadRequest,
				Status:     "400 Bad Request",
				Body:       io.NopCloser(strings.NewReader(`{"error": "Invalid request"}`)),
			}, nil
		},
	}

	// Set API key for test
	originalAPIKey := apiKey
	apiKey = "test-api-key"
	defer func() { apiKey = originalAPIKey }()

	// Execute
	err := SendSMSWithClient(recipients, message, mockClient)

	// Assert
	if err == nil {
		t.Error("Expected an error, got nil")
	}

	if !strings.Contains(err.Error(), "Failed to send SMS") {
		t.Errorf("Expected 'Failed to send SMS' in error message, got %s", err.Error())
	}
}

func TestSendSMS_JSON_Marshalling_Error(t *testing.T) {
	// Setup - create a payload that will fail JSON marshalling
	// We can't easily trigger json.Marshal to fail with simple types,
	// so we'll test the request creation error instead
	recipients := []string{"+27123456789"}
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

	// Set API key for test
	originalAPIKey := apiKey
	apiKey = "test-api-key"
	defer func() { apiKey = originalAPIKey }()

	// Execute
	err := SendSMSWithClient(recipients, message, mockClient)

	// Assert
	if err == nil {
		t.Error("Expected an error, got nil")
	}

	if !strings.Contains(err.Error(), "Error creating request") {
		t.Errorf("Expected 'Error creating request' in error message, got %s", err.Error())
	}
}

func TestSendSMS_EmptyRecipients(t *testing.T) {
	// Setup
	recipients := []string{}
	message := "Test message"

	// Mock successful HTTP response
	mockClient := &MockHTTPClient{
		DoFunc: func(req *http.Request) (*http.Response, error) {
			// Verify empty recipients array in JSON
			body, err := io.ReadAll(req.Body)
			if err != nil {
				t.Fatalf("Failed to read request body: %v", err)
			}

			var payload map[string]interface{}
			if err := json.Unmarshal(body, &payload); err != nil {
				t.Fatalf("Failed to unmarshal JSON: %v", err)
			}

			messageData := payload["message"].(map[string]interface{})
			recipientsData := messageData["recipients"].([]interface{})

			if len(recipientsData) != 0 {
				t.Errorf("Expected 0 recipients, got %d", len(recipientsData))
			}

			return &http.Response{
				StatusCode: http.StatusOK,
				Body:       io.NopCloser(strings.NewReader(`{"status": "success"}`)),
			}, nil
		},
	}

	// Set API key for test
	originalAPIKey := apiKey
	apiKey = "test-api-key"
	defer func() { apiKey = originalAPIKey }()

	// Execute
	err := SendSMSWithClient(recipients, message, mockClient)

	// Assert
	if err != nil {
		t.Errorf("Expected no error, got %v", err)
	}
}

func TestSendSMS_Authorization_Header(t *testing.T) {
	// Setup
	recipients := []string{"+27123456789"}
	message := "Test message"
	testAPIKey := "test-api-key-12345"

	// Mock HTTP client to verify authorization header
	mockClient := &MockHTTPClient{
		DoFunc: func(req *http.Request) (*http.Response, error) {
			authHeader := req.Header.Get("Authorization")
			if authHeader != testAPIKey {
				t.Errorf("Expected Authorization header %s, got %s", testAPIKey, authHeader)
			}

			return &http.Response{
				StatusCode: http.StatusOK,
				Body:       io.NopCloser(strings.NewReader(`{"status": "success"}`)),
			}, nil
		},
	}

	// Set API key for test
	originalAPIKey := apiKey
	apiKey = testAPIKey
	defer func() { apiKey = originalAPIKey }()

	// Execute
	err := SendSMSWithClient(recipients, message, mockClient)

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
		if r.Method != "POST" {
			t.Errorf("Expected POST method, got %s", r.Method)
		}

		if r.Header.Get("Content-Type") != "application/json" {
			t.Errorf("Expected Content-Type application/json")
		}

		// Read and verify body
		body, _ := io.ReadAll(r.Body)
		var payload map[string]interface{}
		json.Unmarshal(body, &payload)

		messageData := payload["message"].(map[string]interface{})
		if messageData["messagetext"] != "Integration test message" {
			t.Errorf("Unexpected message text")
		}

		// Return success response
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status": "success"}`))
	}))
	defer server.Close()

	// Override API URL to use test server
	originalAPIURL := apiURL
	apiURL = server.URL
	defer func() { apiURL = originalAPIURL }()

	// Set API key for test
	originalAPIKey := apiKey
	apiKey = "test-api-key"
	defer func() { apiKey = originalAPIKey }()

	// Test the original function
	err := SendSMS([]string{"+27123456789"}, "Integration test message")

	if err != nil {
		t.Errorf("Expected no error, got %v", err)
	}
}
