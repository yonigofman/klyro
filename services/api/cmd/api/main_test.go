package main

import "testing"

func TestEnvOr(t *testing.T) {
	t.Setenv("KLYRO_TEST_VAR", "")
	if got := envOr("KLYRO_TEST_VAR", "fallback"); got != "fallback" {
		t.Errorf("envOr() with unset var = %q, want %q", got, "fallback")
	}

	t.Setenv("KLYRO_TEST_VAR", "set")
	if got := envOr("KLYRO_TEST_VAR", "fallback"); got != "set" {
		t.Errorf("envOr() with set var = %q, want %q", got, "set")
	}
}

func TestServerTLSConfig_MissingCerts(t *testing.T) {
	if _, err := serverTLSConfig(t.TempDir()); err == nil {
		t.Error("serverTLSConfig() with no cert files present should error, got nil")
	}
}
