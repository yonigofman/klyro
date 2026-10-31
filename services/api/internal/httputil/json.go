// Package httputil holds the small HTTP response helpers shared by every
// handler package, so each one isn't reimplementing the same JSON envelope.
package httputil

import (
	"encoding/json"
	"net/http"
)

// WriteJSON encodes body as the response with the given status code.
func WriteJSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}

// WriteError writes a {"error": message} body with the given status code.
func WriteError(w http.ResponseWriter, status int, message string) {
	WriteJSON(w, status, map[string]string{"error": message})
}
