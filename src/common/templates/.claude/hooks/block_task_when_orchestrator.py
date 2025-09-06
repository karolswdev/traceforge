#!/usr/bin/env python3
import json
print(json.dumps({
  "policy": "blocked",
  "reason": "Use the runner/MCP for nested orchestration instead of Task."
}))

