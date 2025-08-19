package sms

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
)

var (
	apiKey = os.Getenv("SENDMODE_API_KEY")
	apiURL = "https://rest.sendmode.com/v2/send"
)

// HTTPClient interface for dependency injection
type HTTPClient interface {
	Do(req *http.Request) (*http.Response, error)
}

// DefaultHTTPClient is the default HTTP client
var DefaultHTTPClient HTTPClient = &http.Client{}

// SendSMS sends an SMS message to the specified recipients using the default HTTP client
func SendSMS(recipients []string, message string) error {
	return SendSMSWithClient(recipients, message, DefaultHTTPClient)
}

// SendSMSWithClient sends an SMS message using the provided HTTP client for dependency injection
func SendSMSWithClient(recipients []string, message string, client HTTPClient) error {

	// SMS message payload
	payload := map[string]interface{}{
		"message": map[string]interface{}{
			"messagetext": message,
			"recipients":  recipients,
			"senderid":    "DISCON Automated Scheduling System",
		},
	}

	// Convert payload to JSON
	jsonData, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("Error marshalling JSON: %w", err)
	}

	// Create HTTP POST request
	req, err := http.NewRequest("POST", apiURL, bytes.NewBuffer(jsonData))
	if err != nil {
		return fmt.Errorf("Error creating request: %w", err)
	}

	// Set headers
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", apiKey)

	// Send request
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("Error sending request: %w", err)
	}
	defer resp.Body.Close()

	// Check response
	if resp.StatusCode == http.StatusOK || resp.StatusCode == http.StatusCreated {
		return nil
	}

	return fmt.Errorf("Failed to send SMS. %s", resp.Status)
}
