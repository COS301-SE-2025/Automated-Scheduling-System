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

func TestSendSMS_SingleRecipient_Success(t *testing.T) {
	// Setup
	recipient := "27123456789"
	message := "Test message"

	// Set test API key
	originalAPIKey := apiKey
	apiKey = "test-api-key"
	defer func() { apiKey = originalAPIKey }()

	// Mock successful HTTP response
	mockClient := &MockHTTPClient{
		DoFunc: func(req *http.Request) (*http.Response, error) {
			// Verify the request was built correctly
			if req.Method != "POST" {
				t.Errorf("Expected POST method, got %s", req.Method)
			}

			if !strings.Contains(req.URL.String(), "/sms/outgoing/send") {
				t.Errorf("Expected URL to contain /sms/outgoing/send, got %s", req.URL.String())
			}

			// Verify headers
			if req.Header.Get("Content-Type") != "application/json" {
				t.Errorf("Expected Content-Type application/json, got %s", req.Header.Get("Content-Type"))
			}

			if req.Header.Get("AUTHORIZATION") == "" {
				t.Error("Expected AUTHORIZATION header to be set")
			}

			// Verify JSON payload
			body, err := io.ReadAll(req.Body)
			if err != nil {
				t.Fatalf("Failed to read request body: %v", err)
			}

			var messageDetails MessageDetails
			if err := json.Unmarshal(body, &messageDetails); err != nil {
				t.Fatalf("Failed to unmarshal JSON: %v", err)
			}

			// Verify payload structure
			if messageDetails.Message != message {
				t.Errorf("Expected message %s, got %s", message, messageDetails.Message)
			}

			if len(messageDetails.Recipients) != 1 {
				t.Errorf("Expected 1 recipient, got %d", len(messageDetails.Recipients))
			}

			if messageDetails.Recipients[0].MobileNumber != recipient {
				t.Errorf("Expected recipient %s, got %s", recipient, messageDetails.Recipients[0].MobileNumber)
			}

			// Return mock success response
			response := SendSMSResponse{
				BaseResponse: BaseResponse{
					TimeStamp:  "20240911120000000",
					Version:    "1.0",
					StatusCode: 200,
				},
				Recipients: []MessageRecipientResponse{
					{
						MobileNumber:     recipient,
						Accepted:         true,
						AcceptError:      "",
						APIMessageID:     func() *int { id := 12345; return &id }(),
						CreditCost:       1.0,
						NewCreditBalance: 99.0,
					},
				},
			}

			responseBody, _ := json.Marshal(response)
			return &http.Response{
				StatusCode: http.StatusOK,
				Body:       io.NopCloser(strings.NewReader(string(responseBody))),
			}, nil
		},
	}

	// Execute
	resp, err := SendSMSWithClient(recipient, message, mockClient)

	// Assert
	if err != nil {
		t.Errorf("Expected no error, got %v", err)
	}

	if resp == nil {
		t.Fatal("Expected response, got nil")
	}

	if resp.StatusCode != 200 {
		t.Errorf("Expected status code 200, got %d", resp.StatusCode)
	}

	if len(resp.Recipients) != 1 {
		t.Errorf("Expected 1 recipient response, got %d", len(resp.Recipients))
	}

	if !resp.Recipients[0].Accepted {
		t.Error("Expected recipient to be accepted")
	}
}

func TestSendSMSBulk_MultipleRecipients_Success(t *testing.T) {
	// Setup
	message := "Bulk test message"
	recipients := []MessageRecipient{
		{MobileNumber: "27123456789", ClientMessageID: "msg1"},
		{MobileNumber: "27987654321", ClientMessageID: "msg2"},
	}

	// Set test API key
	originalAPIKey := apiKey
	apiKey = "test-api-key"
	defer func() { apiKey = originalAPIKey }()

	// Mock successful HTTP response
	mockClient := &MockHTTPClient{
		DoFunc: func(req *http.Request) (*http.Response, error) {
			// Verify JSON payload
			body, err := io.ReadAll(req.Body)
			if err != nil {
				t.Fatalf("Failed to read request body: %v", err)
			}

			var messageDetails MessageDetails
			if err := json.Unmarshal(body, &messageDetails); err != nil {
				t.Fatalf("Failed to unmarshal JSON: %v", err)
			}

			if len(messageDetails.Recipients) != 2 {
				t.Errorf("Expected 2 recipients, got %d", len(messageDetails.Recipients))
			}

			// Return mock success response
			response := SendSMSResponse{
				BaseResponse: BaseResponse{
					TimeStamp:  "20240911120000000",
					Version:    "1.0",
					StatusCode: 200,
				},
				Recipients: []MessageRecipientResponse{
					{
						ClientMessageID:  "msg1",
						MobileNumber:     "27123456789",
						Accepted:         true,
						APIMessageID:     func() *int { id := 12345; return &id }(),
						CreditCost:       1.0,
						NewCreditBalance: 98.0,
					},
					{
						ClientMessageID:  "msg2",
						MobileNumber:     "27987654321",
						Accepted:         true,
						APIMessageID:     func() *int { id := 12346; return &id }(),
						CreditCost:       1.0,
						NewCreditBalance: 97.0,
					},
				},
			}

			responseBody, _ := json.Marshal(response)
			return &http.Response{
				StatusCode: http.StatusOK,
				Body:       io.NopCloser(strings.NewReader(string(responseBody))),
			}, nil
		},
	}

	// Execute
	resp, err := SendSMSBulkWithClient(message, recipients, mockClient)

	// Assert
	if err != nil {
		t.Errorf("Expected no error, got %v", err)
	}

	if len(resp.Recipients) != 2 {
		t.Errorf("Expected 2 recipient responses, got %d", len(resp.Recipients))
	}
}

func TestGetAvailableCredits_Success(t *testing.T) {
	// Set test API key
	originalAPIKey := apiKey
	apiKey = "test-api-key"
	defer func() { apiKey = originalAPIKey }()

	// Mock successful HTTP response
	mockClient := &MockHTTPClient{
		DoFunc: func(req *http.Request) (*http.Response, error) {
			// Verify the request was built correctly
			if req.Method != "GET" {
				t.Errorf("Expected GET method, got %s", req.Method)
			}

			if !strings.Contains(req.URL.String(), "/credits/balance") {
				t.Errorf("Expected URL to contain /credits/balance, got %s", req.URL.String())
			}

			if req.Header.Get("AUTHORIZATION") == "" {
				t.Error("Expected AUTHORIZATION header to be set")
			}

			// Return mock success response
			response := CreditBalanceResponse{
				BaseResponse: BaseResponse{
					TimeStamp:  "20240911120000000",
					Version:    "1.0",
					StatusCode: 200,
				},
				CreditBalance: 150.5,
			}

			responseBody, _ := json.Marshal(response)
			return &http.Response{
				StatusCode: http.StatusOK,
				Body:       io.NopCloser(strings.NewReader(string(responseBody))),
			}, nil
		},
	}

	// Execute
	resp, err := GetAvailableCreditsWithClient(mockClient)

	// Assert
	if err != nil {
		t.Errorf("Expected no error, got %v", err)
	}

	if resp == nil {
		t.Fatal("Expected response, got nil")
	}

	if resp.CreditBalance != 150.5 {
		t.Errorf("Expected credit balance 150.5, got %f", resp.CreditBalance)
	}
}

func TestGetSMSStatus_Success(t *testing.T) {
	// Setup
	messageIDs := []int{12345, 12346}

	// Set test API key
	originalAPIKey := apiKey
	apiKey = "test-api-key"
	defer func() { apiKey = originalAPIKey }()

	// Mock successful HTTP response
	mockClient := &MockHTTPClient{
		DoFunc: func(req *http.Request) (*http.Response, error) {
			// Verify the request was built correctly
			if req.Method != "POST" {
				t.Errorf("Expected POST method, got %s", req.Method)
			}

			if !strings.Contains(req.URL.String(), "/sms/outgoing/status") {
				t.Errorf("Expected URL to contain /sms/outgoing/status, got %s", req.URL.String())
			}

			// Verify JSON payload
			body, err := io.ReadAll(req.Body)
			if err != nil {
				t.Fatalf("Failed to read request body: %v", err)
			}

			var requestIDs []int
			if err := json.Unmarshal(body, &requestIDs); err != nil {
				t.Fatalf("Failed to unmarshal JSON: %v", err)
			}

			if len(requestIDs) != 2 {
				t.Errorf("Expected 2 message IDs, got %d", len(requestIDs))
			}

			// Return mock success response
			response := SMSStatusResponse{
				BaseResponse: BaseResponse{
					TimeStamp:  "20240911120000000",
					Version:    "1.0",
					StatusCode: 200,
				},
				MessageStatuses: []MessageStatus{
					{
						APIMessageID:    12345,
						MobileNumber:    "27123456789",
						StatusDelivered: true,
						StatusErrorCode: "",
						StatusTime:      "202409111200",
						CreditCost:      1.0,
					},
					{
						APIMessageID:    12346,
						MobileNumber:    "27987654321",
						StatusDelivered: false,
						StatusErrorCode: "FAILED",
						StatusTime:      "202409111201",
						CreditCost:      1.0,
					},
				},
			}

			responseBody, _ := json.Marshal(response)
			return &http.Response{
				StatusCode: http.StatusOK,
				Body:       io.NopCloser(strings.NewReader(string(responseBody))),
			}, nil
		},
	}

	// Execute
	resp, err := GetSMSStatusWithClient(messageIDs, mockClient)

	// Assert
	if err != nil {
		t.Errorf("Expected no error, got %v", err)
	}

	if resp == nil {
		t.Fatal("Expected response, got nil")
	}

	if len(resp.MessageStatuses) != 2 {
		t.Errorf("Expected 2 message statuses, got %d", len(resp.MessageStatuses))
	}

	if resp.MessageStatuses[0].APIMessageID != 12345 {
		t.Errorf("Expected message ID 12345, got %d", resp.MessageStatuses[0].APIMessageID)
	}

	if !resp.MessageStatuses[0].StatusDelivered {
		t.Error("Expected first message to be delivered")
	}

	if resp.MessageStatuses[1].StatusDelivered {
		t.Error("Expected second message to not be delivered")
	}
}

func TestSendSMS_Network_Error(t *testing.T) {
	// Setup
	recipient := "27123456789"
	message := "Test message"

	// Set test API key
	originalAPIKey := apiKey
	apiKey = "test-api-key"
	defer func() { apiKey = originalAPIKey }()

	// Mock HTTP client that returns an error
	mockClient := &MockHTTPClient{
		DoFunc: func(req *http.Request) (*http.Response, error) {
			return nil, fmt.Errorf("network error")
		},
	}

	// Execute
	_, err := SendSMSWithClient(recipient, message, mockClient)

	// Assert
	if err == nil {
		t.Error("Expected an error, got nil")
	}

	if !strings.Contains(err.Error(), "error sending request") {
		t.Errorf("Expected 'error sending request' in error message, got %s", err.Error())
	}
}

func TestSendSMS_API_Error_Response(t *testing.T) {
	// Setup
	recipient := "27123456789"
	message := "Test message"

	// Set test API key
	originalAPIKey := apiKey
	apiKey = "test-api-key"
	defer func() { apiKey = originalAPIKey }()

	// Mock HTTP client that returns an API error
	mockClient := &MockHTTPClient{
		DoFunc: func(req *http.Request) (*http.Response, error) {
			errorResponse := ErrorResponse{
				BaseResponse: BaseResponse{
					TimeStamp:  "20240911120000000",
					Version:    "1.0",
					StatusCode: 401,
				},
				ErrorMessage: "Unauthorized - Invalid API key",
			}

			responseBody, _ := json.Marshal(errorResponse)
			return &http.Response{
				StatusCode: http.StatusUnauthorized,
				Body:       io.NopCloser(strings.NewReader(string(responseBody))),
			}, nil
		},
	}

	// Execute
	_, err := SendSMSWithClient(recipient, message, mockClient)

	// Assert
	if err == nil {
		t.Error("Expected an error, got nil")
	}

	if !strings.Contains(err.Error(), "Unauthorized - Invalid API key") {
		t.Errorf("Expected API error message in error, got %s", err.Error())
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
		var messageDetails MessageDetails
		json.Unmarshal(body, &messageDetails)

		if messageDetails.Message != "Integration test message" {
			t.Errorf("Unexpected message text")
		}

		// Return success response
		response := SendSMSResponse{
			BaseResponse: BaseResponse{
				TimeStamp:  "20240911120000000",
				Version:    "1.0",
				StatusCode: 200,
			},
			Recipients: []MessageRecipientResponse{
				{
					MobileNumber:     "27123456789",
					Accepted:         true,
					APIMessageID:     func() *int { id := 12345; return &id }(),
					CreditCost:       1.0,
					NewCreditBalance: 99.0,
				},
			},
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(response)
	}))
	defer server.Close()

	// Override base URL to use test server
	originalBaseURL := baseURL
	baseURL = server.URL
	defer func() { baseURL = originalBaseURL }()

	// Set test API key
	originalAPIKey := apiKey
	apiKey = "test-api-key"
	defer func() { apiKey = originalAPIKey }()

	// Test the original function
	resp, err := SendSMS("27123456789", "Integration test message")

	if err != nil {
		t.Errorf("Expected no error, got %v", err)
	}

	if resp == nil {
		t.Fatal("Expected response, got nil")
	}

	if resp.StatusCode != 200 {
		t.Errorf("Expected status code 200, got %d", resp.StatusCode)
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
	_, err := SendSMSWithClient(recipient, message, mockClient)

	// Assert
	if err == nil {
		t.Error("Expected an error, got nil")
	}

	if !strings.Contains(err.Error(), "error sending request") {
		t.Errorf("Expected 'error sending request' in error message, got %s", err.Error())
	}
}

func TestSendSMS_HTTP_BadResponse(t *testing.T) {
	// Setup
	recipient := "27123456789"
	message := "Test message"

	// Set test API key
	originalAPIKey := apiKey
	apiKey = "test-api-key"
	defer func() { apiKey = originalAPIKey }()

	// Mock HTTP client that returns a bad response
	mockClient := &MockHTTPClient{
		DoFunc: func(req *http.Request) (*http.Response, error) {
			errorResponse := ErrorResponse{
				BaseResponse: BaseResponse{
					TimeStamp:  "20240911120000000",
					Version:    "1.0",
					StatusCode: 400,
				},
				ErrorMessage: "Invalid request",
			}

			responseBody, _ := json.Marshal(errorResponse)
			return &http.Response{
				StatusCode: http.StatusBadRequest,
				Status:     "400 Bad Request",
				Body:       io.NopCloser(strings.NewReader(string(responseBody))),
			}, nil
		},
	}

	// Execute
	_, err := SendSMSWithClient(recipient, message, mockClient)

	// Assert
	if err == nil {
		t.Error("Expected an error, got nil")
	}

	if !strings.Contains(err.Error(), "Invalid request") {
		t.Errorf("Expected 'Invalid request' in error message, got %s", err.Error())
	}
}

func TestSendSMS_Request_Creation_Error(t *testing.T) {
	// Setup - create a scenario that will fail URL creation
	recipient := "27123456789"
	message := "Test message"

	// Set test API key
	originalAPIKey := apiKey
	apiKey = "test-api-key"
	defer func() { apiKey = originalAPIKey }()

	// Mock HTTP client - shouldn't be called due to earlier error
	mockClient := &MockHTTPClient{
		DoFunc: func(req *http.Request) (*http.Response, error) {
			t.Error("HTTP client should not be called when request creation fails")
			return nil, nil
		},
	}

	// Set invalid base URL to trigger request creation error
	originalBaseURL := baseURL
	baseURL = "://invalid-url"
	defer func() { baseURL = originalBaseURL }()

	// Execute
	_, err := SendSMSWithClient(recipient, message, mockClient)

	// Assert
	if err == nil {
		t.Error("Expected an error, got nil")
	}

	if !strings.Contains(err.Error(), "error creating request") {
		t.Errorf("Expected 'error creating request' in error message, got %s", err.Error())
	}
}

func TestSendSMS_Multiple_Recipients_Integration(t *testing.T) {
	// Setup - Test bulk SMS functionality
	message := "Test message"
	recipients := []MessageRecipient{
		{MobileNumber: "27123456789", ClientMessageID: "msg1"},
		{MobileNumber: "27987654321", ClientMessageID: "msg2"},
	}

	// Set test API key
	originalAPIKey := apiKey
	apiKey = "test-api-key"
	defer func() { apiKey = originalAPIKey }()

	callCount := 0
	// Mock successful HTTP response
	mockClient := &MockHTTPClient{
		DoFunc: func(req *http.Request) (*http.Response, error) {
			callCount++

			// Verify JSON payload
			body, err := io.ReadAll(req.Body)
			if err != nil {
				t.Fatalf("Failed to read request body: %v", err)
			}

			var messageDetails MessageDetails
			if err := json.Unmarshal(body, &messageDetails); err != nil {
				t.Fatalf("Failed to unmarshal JSON: %v", err)
			}

			if messageDetails.Message != message {
				t.Errorf("Expected message %s, got %s", message, messageDetails.Message)
			}

			if len(messageDetails.Recipients) != len(recipients) {
				t.Errorf("Expected %d recipients, got %d", len(recipients), len(messageDetails.Recipients))
			}

			// Return mock success response
			response := SendSMSResponse{
				BaseResponse: BaseResponse{
					TimeStamp:  "20240911120000000",
					Version:    "1.0",
					StatusCode: 200,
				},
				Recipients: []MessageRecipientResponse{
					{
						ClientMessageID:  "msg1",
						MobileNumber:     "27123456789",
						Accepted:         true,
						APIMessageID:     func() *int { id := 12345; return &id }(),
						CreditCost:       1.0,
						NewCreditBalance: 98.0,
					},
					{
						ClientMessageID:  "msg2",
						MobileNumber:     "27987654321",
						Accepted:         true,
						APIMessageID:     func() *int { id := 12346; return &id }(),
						CreditCost:       1.0,
						NewCreditBalance: 97.0,
					},
				},
			}

			responseBody, _ := json.Marshal(response)
			return &http.Response{
				StatusCode: http.StatusOK,
				Body:       io.NopCloser(strings.NewReader(string(responseBody))),
			}, nil
		},
	}

	// Execute
	resp, err := SendSMSBulkWithClient(message, recipients, mockClient)

	// Assert
	if err != nil {
		t.Errorf("Expected no error, got %v", err)
	}

	if callCount != 1 {
		t.Errorf("Expected 1 HTTP call, got %d", callCount)
	}

	if len(resp.Recipients) != 2 {
		t.Errorf("Expected 2 recipient responses, got %d", len(resp.Recipients))
	}
}

func TestSendSMS_JSON_Parameters(t *testing.T) {
	// Setup
	recipient := "27123456789"
	message := "Test message with spaces & special chars!"

	// Set test API key
	originalAPIKey := apiKey
	apiKey = "test-api-key"
	defer func() { apiKey = originalAPIKey }()

	// Mock HTTP client to verify JSON parameters
	mockClient := &MockHTTPClient{
		DoFunc: func(req *http.Request) (*http.Response, error) {
			// Verify JSON payload
			body, err := io.ReadAll(req.Body)
			if err != nil {
				t.Fatalf("Failed to read request body: %v", err)
			}

			var messageDetails MessageDetails
			if err := json.Unmarshal(body, &messageDetails); err != nil {
				t.Fatalf("Failed to unmarshal JSON: %v", err)
			}

			// Verify all required parameters are present and correct
			if messageDetails.Message != message {
				t.Errorf("Expected message=%s, got %s", message, messageDetails.Message)
			}

			if len(messageDetails.Recipients) != 1 {
				t.Errorf("Expected 1 recipient, got %d", len(messageDetails.Recipients))
			}

			if messageDetails.Recipients[0].MobileNumber != recipient {
				t.Errorf("Expected recipient=%s, got %s", recipient, messageDetails.Recipients[0].MobileNumber)
			}

			// Verify headers
			if req.Header.Get("Content-Type") != "application/json" {
				t.Errorf("Expected Content-Type application/json, got %s", req.Header.Get("Content-Type"))
			}

			if req.Header.Get("AUTHORIZATION") == "" {
				t.Error("Expected AUTHORIZATION header to be set")
			}

			// Return mock success response
			response := SendSMSResponse{
				BaseResponse: BaseResponse{
					TimeStamp:  "20240911120000000",
					Version:    "1.0",
					StatusCode: 200,
				},
				Recipients: []MessageRecipientResponse{
					{
						MobileNumber:     recipient,
						Accepted:         true,
						APIMessageID:     func() *int { id := 12345; return &id }(),
						CreditCost:       1.0,
						NewCreditBalance: 99.0,
					},
				},
			}

			responseBody, _ := json.Marshal(response)
			return &http.Response{
				StatusCode: http.StatusOK,
				Body:       io.NopCloser(strings.NewReader(string(responseBody))),
			}, nil
		},
	}

	// Execute
	_, err := SendSMSWithClient(recipient, message, mockClient)

	// Assert
	if err != nil {
		t.Errorf("Expected no error, got %v", err)
	}
}

// Test the original function with httptest server
func TestSendSMS_Integration_WithTestServer_WinSMS(t *testing.T) {
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
		var messageDetails MessageDetails
		json.Unmarshal(body, &messageDetails)

		if messageDetails.Message != "Integration test message" {
			t.Errorf("Unexpected message text")
		}

		// Return success response
		response := SendSMSResponse{
			BaseResponse: BaseResponse{
				TimeStamp:  "20240911120000000",
				Version:    "1.0",
				StatusCode: 200,
			},
			Recipients: []MessageRecipientResponse{
				{
					MobileNumber:     "27123456789",
					Accepted:         true,
					APIMessageID:     func() *int { id := 12345; return &id }(),
					CreditCost:       1.0,
					NewCreditBalance: 99.0,
				},
			},
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(response)
	}))
	defer server.Close()

	// Override base URL to use test server
	originalBaseURL := baseURL
	baseURL = server.URL
	defer func() { baseURL = originalBaseURL }()

	// Set test API key
	originalAPIKey := apiKey
	apiKey = "test-api-key"
	defer func() { apiKey = originalAPIKey }()

	// Test the original function
	resp, err := SendSMS("27123456789", "Integration test message")

	if err != nil {
		t.Errorf("Expected no error, got %v", err)
	}

	if resp == nil {
		t.Fatal("Expected response, got nil")
	}

	if resp.StatusCode != 200 {
		t.Errorf("Expected status code 200, got %d", resp.StatusCode)
	}
}
