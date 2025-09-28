//go:build unit

package scheduler

import (
    "testing"
    "time"

    "github.com/stretchr/testify/assert"
)

func TestIntFromAny(t *testing.T) {
    assert.Equal(t, 5, intFromAny(5))
    assert.Equal(t, 5, intFromAny(int32(5)))
    assert.Equal(t, 5, intFromAny(int64(5)))
    assert.Equal(t, 5, intFromAny(float32(5.7))) // trunc
    assert.Equal(t, 5, intFromAny(float64(5.7))) // trunc
    assert.Equal(t, 41, intFromAny("41"))
    assert.Equal(t, 41, intFromAny("41.9"))     // via ParseFloat, truncates
    assert.Equal(t, 0, intFromAny(""))          // empty -> 0
    assert.Equal(t, 0, intFromAny("notAnInt"))  // invalid -> 0
    assert.Equal(t, 0, intFromAny(struct{}{}))  // unsupported -> 0
}

func TestToInt(t *testing.T) {
    assert.Equal(t, 6, toInt(6))
    assert.Equal(t, 6, toInt(int32(6)))
    assert.Equal(t, 6, toInt(int64(6)))
    assert.Equal(t, 6, toInt(float32(5.6)))     // rounds
    assert.Equal(t, 6, toInt(float64(5.6)))     // rounds
    assert.Equal(t, 42, toInt("42"))
    assert.Equal(t, 42, toInt("41.6"))          // rounds
    assert.Equal(t, 0, toInt(""))
    assert.Equal(t, 0, toInt("oops"))
}

func TestToDuration(t *testing.T) {
    assert.Equal(t, time.Minute*10, toDuration(10, "minutes"))
    assert.Equal(t, time.Hour*3, toDuration(3, "hours"))
    assert.Equal(t, 24*time.Hour, toDuration(1, "day"))
    assert.Equal(t, 7*24*time.Hour, toDuration(1, "week"))
    assert.Equal(t, 30*24*time.Hour, toDuration(1, "month"))
    assert.Equal(t, time.Duration(0), toDuration(5, "unknown"))
}