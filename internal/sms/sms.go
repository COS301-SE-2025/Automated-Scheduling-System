package sms

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
)

var (
	apiKey  = os.Getenv("WINSMS_API_KEY")
	baseURL = "https://www.winsms.co.za/api/rest/v1"
)

// HTTPClient interface for dependency injection
type HTTPClient interface {
	Do(req *http.Request) (*http.Response, error)
}

// DefaultHTTPClient is the default HTTP client
var DefaultHTTPClient HTTPClient = &http.Client{}

// Common response fields for all WinSMS API responses
type BaseResponse struct {
	TimeStamp  string `json:"timeStamp"`
	Version    string `json:"version"`
	StatusCode int    `json:"statusCode"`
}

// Error response structure
type ErrorResponse struct {
	BaseResponse
	ErrorMessage string `json:"errorMessage"`
}

// Message recipient for sending SMS
type MessageRecipient struct {
	MobileNumber    string `json:"mobileNumber"`
	ClientMessageID string `json:"clientMessageId,omitempty"`
}

// SMS message details for sending
type MessageDetails struct {
	Message       string             `json:"message"`
	Recipients    []MessageRecipient `json:"recipients"`
	ScheduledTime string             `json:"scheduledTime,omitempty"`
	MaxSegments   int                `json:"maxSegments,omitempty"`
}

// Message recipient response from API
type MessageRecipientResponse struct {
	ClientMessageID  string  `json:"clientMessageId"`
	MobileNumber     string  `json:"mobileNumber"`
	Accepted         bool    `json:"accepted"`
	AcceptError      string  `json:"acceptError"`
	APIMessageID     *int    `json:"apiMessageId"`
	ScheduledTime    string  `json:"scheduledTime"`
	CreditCost       float64 `json:"creditCost"`
	NewCreditBalance float64 `json:"newCreditBalance"`
}

// SMS send response
type SendSMSResponse struct {
	BaseResponse
	Recipients []MessageRecipientResponse `json:"recipients"`
}

// Credit balance response
type CreditBalanceResponse struct {
	BaseResponse
	CreditBalance float64 `json:"creditBalance"`
}

// Message status for status queries
type MessageStatus struct {
	APIMessageID    int     `json:"apiMessageId"`
	MobileNumber    string  `json:"mobileNumber"`
	StatusDelivered bool    `json:"statusDelivered"`
	StatusErrorCode string  `json:"statusErrorCode"`
	StatusTime      string  `json:"statusTime"`
	CreditCost      float64 `json:"creditCost"`
}

// SMS status response
type SMSStatusResponse struct {
	BaseResponse
	MessageStatuses []MessageStatus `json:"messageStatuses"`
}

// SendSMS sends an SMS to a single recipient
func SendSMS(recipient string, message string) (*SendSMSResponse, error) {
	return SendSMSWithClient(recipient, message, DefaultHTTPClient)
}

// SendSMSWithClient sends an SMS to a single recipient using the provided HTTP client
func SendSMSWithClient(recipient string, message string, client HTTPClient) (*SendSMSResponse, error) {
	recipients := []MessageRecipient{
		{MobileNumber: recipient},
	}
	return SendSMSBulkWithClient(message, recipients, client)
}

// SendSMSBulk sends an SMS to multiple recipients
func SendSMSBulk(message string, recipients []MessageRecipient) (*SendSMSResponse, error) {
	return SendSMSBulkWithClient(message, recipients, DefaultHTTPClient)
}

// SendSMSBulkWithClient sends an SMS to multiple recipients using the provided HTTP client
func SendSMSBulkWithClient(message string, recipients []MessageRecipient, client HTTPClient) (*SendSMSResponse, error) {
	messageDetails := MessageDetails{
		Message:    message,
		Recipients: recipients,
	}

	// Convert to JSON
	jsonData, err := json.Marshal(messageDetails)
	if err != nil {
		return nil, fmt.Errorf("error marshalling JSON: %w", err)
	}

	// Create HTTP POST request
	req, err := http.NewRequest("POST", baseURL+"/sms/outgoing/send", bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, fmt.Errorf("error creating request: %w", err)
	}

	// Set headers
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("AUTHORIZATION", apiKey)

	// Send request
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("error sending request: %w", err)
	}
	defer func() {
		if closeErr := resp.Body.Close(); closeErr != nil {
			fmt.Println("Error closing resp body:", closeErr)
		}
	}()

	// Read response body
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("error reading response body: %w", err)
	}

	// Check for error responses
	if resp.StatusCode >= 400 {
		var errorResp ErrorResponse
		if err := json.Unmarshal(body, &errorResp); err != nil {
			return nil, fmt.Errorf("API error (status %d): %s", resp.StatusCode, string(body))
		}
		return nil, fmt.Errorf("API error: %s", errorResp.ErrorMessage)
	}

	// Parse successful response
	var smsResp SendSMSResponse
	if err := json.Unmarshal(body, &smsResp); err != nil {
		return nil, fmt.Errorf("error unmarshalling response: %w", err)
	}

	log.Printf("SMS sent successfully. Response: %+v", smsResp)
	return &smsResp, nil
}

// GetAvailableCredits retrieves the current credit balance
func GetAvailableCredits() (*CreditBalanceResponse, error) {
	return GetAvailableCreditsWithClient(DefaultHTTPClient)
}

// GetAvailableCreditsWithClient retrieves the current credit balance using the provided HTTP client
func GetAvailableCreditsWithClient(client HTTPClient) (*CreditBalanceResponse, error) {
	// Create HTTP GET request
	req, err := http.NewRequest("GET", baseURL+"/credits/balance", nil)
	if err != nil {
		return nil, fmt.Errorf("error creating request: %w", err)
	}

	// Set headers
	req.Header.Set("AUTHORIZATION", apiKey)

	// Send request
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("error sending request: %w", err)
	}
	defer func() {
		if closeErr := resp.Body.Close(); closeErr != nil {
			fmt.Println("Error closing resp body:", closeErr)
		}
	}()

	// Read response body
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("error reading response body: %w", err)
	}

	// Check for error responses
	if resp.StatusCode >= 400 {
		var errorResp ErrorResponse
		if err := json.Unmarshal(body, &errorResp); err != nil {
			return nil, fmt.Errorf("API error (status %d): %s", resp.StatusCode, string(body))
		}
		return nil, fmt.Errorf("API error: %s", errorResp.ErrorMessage)
	}

	// Parse successful response
	var creditResp CreditBalanceResponse
	if err := json.Unmarshal(body, &creditResp); err != nil {
		return nil, fmt.Errorf("error unmarshalling response: %w", err)
	}

	log.Printf("Credit balance retrieved: %.1f", creditResp.CreditBalance)
	return &creditResp, nil
}

// GetSMSStatus retrieves the delivery status of SMS messages by their API message IDs
func GetSMSStatus(messageIDs []int) (*SMSStatusResponse, error) {
	return GetSMSStatusWithClient(messageIDs, DefaultHTTPClient)
}

// GetSMSStatusWithClient retrieves the delivery status of SMS messages using the provided HTTP client
func GetSMSStatusWithClient(messageIDs []int, client HTTPClient) (*SMSStatusResponse, error) {
	// Convert to JSON
	jsonData, err := json.Marshal(messageIDs)
	if err != nil {
		return nil, fmt.Errorf("error marshalling JSON: %w", err)
	}

	// Create HTTP POST request
	req, err := http.NewRequest("POST", baseURL+"/sms/outgoing/status", bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, fmt.Errorf("error creating request: %w", err)
	}

	// Set headers
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("AUTHORIZATION", apiKey)

	// Send request
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("error sending request: %w", err)
	}
	defer resp.Body.Close()

	// Read response body
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("error reading response body: %w", err)
	}

	// Check for error responses
	if resp.StatusCode >= 400 {
		var errorResp ErrorResponse
		if err := json.Unmarshal(body, &errorResp); err != nil {
			return nil, fmt.Errorf("API error (status %d): %s", resp.StatusCode, string(body))
		}
		return nil, fmt.Errorf("API error: %s", errorResp.ErrorMessage)
	}

	// Parse successful response
	var statusResp SMSStatusResponse
	if err := json.Unmarshal(body, &statusResp); err != nil {
		return nil, fmt.Errorf("error unmarshalling response: %w", err)
	}

	log.Printf("SMS status retrieved for %d messages", len(statusResp.MessageStatuses))
	return &statusResp, nil
}
