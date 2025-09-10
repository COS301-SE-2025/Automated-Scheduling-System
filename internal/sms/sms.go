package sms

import (
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
)

var (
	apiKey      = os.Getenv("SENDMODE_API_KEY")
	apiURL      = "https://api.sendmode.co.za/httppost.aspx"
	apiUsername = os.Getenv("SENDMODE_USERNAME")
	apiPassword = os.Getenv("SENDMODE_PASSWORD")
)

// HTTPClient interface for dependency injection
type HTTPClient interface {
	Do(req *http.Request) (*http.Response, error)
}

type SendSMSRequest struct {
	Type       string `json:"type"`
	Username   string `json:"username"`
	Password   string `json:"password"`
	NumTo      string `json:"numto"`
	Data1      string `json:"data1"`
	CustomerID string `json:"customerid,omitempty"`
}

// DefaultHTTPClient is the default HTTP client
var DefaultHTTPClient HTTPClient = &http.Client{}

// SendSMS sends an SMS message to the specified recipients using the default HTTP client
func SendSMS(recipients []string, message string) error {
	for _, recipient := range recipients {
		err := SendSMSWithClient(recipient, message, DefaultHTTPClient)
		if err != nil {
			return fmt.Errorf("failed to send SMS to %s: %w", recipient, err)
		}
	}
	return nil
}

// SendSMSWithClient sends an SMS message using the provided HTTP client for dependency injection
func SendSMSWithClient(recipient string, message string, client HTTPClient) error {

	// Build URL with query parameters for GET request
	params := url.Values{}
	params.Add("type", "sendparam")
	params.Add("username", apiUsername)
	params.Add("password", apiPassword)
	params.Add("numto", recipient)
	params.Add("data1", message)

	// Create the full URL with encoded parameters
	fullURL := fmt.Sprintf("%s?%s", apiURL, params.Encode())

	// Create HTTP GET request (no body needed for GET)
	req, err := http.NewRequest("GET", fullURL, nil)
	if err != nil {
		return fmt.Errorf("Error creating request: %w", err)
	}

	// Set headers
	req.Header.Set("User-Agent", "Automated-Scheduling-System/1.0 (SMS-Service)")

	// Send http request
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("Error sending request: %w", err)
	}
	defer resp.Body.Close()

	// Read the response body
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("Error reading response body: %w", err)
	}

	// // Nice logging for debugging
	// log.Printf("=== SMS API Response ===")
	// log.Printf("Status Code: %d", resp.StatusCode)
	// log.Printf("Status: %s", resp.Status)
	// log.Printf("Headers: %v", resp.Header)
	// log.Printf("Response Body: %s", string(body))
	// log.Printf("========================")

	// Check if request was successful
	if resp.StatusCode >= 200 && resp.StatusCode < 300 {
		// log.Printf("SMS sent successfully to %s", recipient)
		return nil
	}

	return fmt.Errorf("Failed to send SMS to %s. Status: %d, Response: %s", recipient, resp.StatusCode, string(body))
}
