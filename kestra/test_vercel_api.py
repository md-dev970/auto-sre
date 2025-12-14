#!/usr/bin/env python3
"""
Test script to verify Vercel API access and find the correct project
"""
import os
import requests
import json

# Get token from environment
TOKEN = os.getenv("VERCEL_TOKEN")
if not TOKEN:
    print("❌ ERROR: VERCEL_TOKEN environment variable not set!")
    print("Set it with: export VERCEL_TOKEN='your_token_here'")
    exit(1)

HEADERS = {
    "Authorization": f"Bearer {TOKEN}"
}

print("=" * 60)
print("VERCEL API TEST SCRIPT")
print("=" * 60)
print(f"\n🔑 Using token: {TOKEN[:8]}...{TOKEN[-4:]} (length: {len(TOKEN)})")

# Test 1: Check token validity by getting user info
print("\n1️⃣  Testing token validity...")
try:
    r = requests.get("https://api.vercel.com/v2/user", headers=HEADERS, timeout=10)
    if r.status_code == 403:
        print("⚠️  Got 403 Forbidden from /v2/user endpoint")
        print("    This might be a token permissions issue or wrong endpoint")
        print("    Trying alternative: listing projects instead...")
    else:
        r.raise_for_status()
        user = r.json()
        print(f"✅ Token valid! User: {user.get('username', 'N/A')} ({user.get('email', 'N/A')})")
except Exception as e:
    print(f"⚠️  User endpoint failed: {e}")
    print("    Continuing with projects endpoint test...")

# Test 2: List all projects
print("\n2️⃣  Fetching all projects...")
try:
    r = requests.get("https://api.vercel.com/v9/projects?limit=100", headers=HEADERS, timeout=10)
    
    print(f"    HTTP Status: {r.status_code}")
    
    if r.status_code == 403:
        print("❌ 403 Forbidden - Token doesn't have access to projects!")
        print("    Possible issues:")
        print("    1. Token is invalid or expired")
        print("    2. Token doesn't have 'Read Project' permissions")
        print("    3. Projects belong to a team (need teamId parameter)")
        print("\n    Raw response:")
        print(f"    {r.text[:500]}")
        exit(1)
    
    r.raise_for_status()
    projects_data = r.json()
    projects = projects_data.get("projects", [])
    
    print(f"✅ Found {len(projects)} project(s)")
    
    if not projects:
        print("⚠️  No projects found!")
        print("    Response structure:")
        print(f"    {json.dumps(projects_data, indent=2)[:500]}")
        print("\n    This might mean:")
        print("    1. No projects exist under this account")
        print("    2. Projects are under a team (need teamId)")
        exit(1)
    
    print("\nProjects list:")
    print("-" * 60)
    for i, project in enumerate(projects, 1):
        project_id = project.get("id", "N/A")
        project_name = project.get("name", "N/A")
        repo_link = project.get("link", {})
        repo_type = repo_link.get("type", "N/A")
        repo_name = repo_link.get("repo", "N/A")
        
        print(f"{i}. Name: {project_name}")
        print(f"   ID: {project_id}")
        print(f"   Repo: {repo_type}/{repo_name}")
        print()
    
except Exception as e:
    print(f"❌ Failed to fetch projects: {e}")
    print(f"    Error type: {type(e).__name__}")
    exit(1)

# Test 3: Ask user which project to check
print("\n3️⃣  Select a project to check deployments:")
project_name = input("Enter project name (e.g., 'app-abubbwyfyxf1ozkjgust2'): ").strip()

# Find the project
selected_project = None
for p in projects:
    if p.get("name") == project_name:
        selected_project = p
        break

if not selected_project:
    print(f"❌ Project '{project_name}' not found!")
    print(f"Available projects: {', '.join([p.get('name', 'N/A') for p in projects])}")
    exit(1)

project_id = selected_project["id"]
print(f"✅ Found project: {project_name} (ID: {project_id})")

# Test 4: Get recent deployments for this project
print(f"\n4️⃣  Fetching deployments for project {project_name}...")
try:
    r = requests.get(
        "https://api.vercel.com/v6/deployments",
        headers=HEADERS,
        params={"projectId": project_id, "limit": 10},
        timeout=10
    )
    
    if r.status_code != 200:
        print(f"⚠️  HTTP {r.status_code} - Response: {r.text[:200]}")
    
    r.raise_for_status()
    deployments_data = r.json()
    deployments = deployments_data.get("deployments", [])
    
    print(f"✅ Found {len(deployments)} deployment(s)")
    print("\nRecent deployments:")
    print("-" * 60)
    for i, dep in enumerate(deployments[:5], 1):
        dep_id = dep.get("uid", "N/A")
        dep_url = dep.get("url", "N/A")
        dep_state = dep.get("state", "N/A")
        git_sha = dep.get("meta", {}).get("githubCommitSha", "N/A")
        
        print(f"{i}. URL: {dep_url}")
        print(f"   ID: {dep_id}")
        print(f"   State: {dep_state}")
        print(f"   Commit: {git_sha[:7] if git_sha != 'N/A' else 'N/A'}")
        print()
    
    if not deployments:
        print("⚠️  No deployments found for this project!")
        exit(1)
    
except Exception as e:
    print(f"❌ Failed to fetch deployments: {e}")
    exit(1)

# Test 5: Get build logs for the first deployment
first_deployment = deployments[0]
dep_id = first_deployment.get("uid")
print(f"\n5️⃣  Fetching build logs for deployment {dep_id[:10]}...")

try:
    r = requests.get(
        f"https://api.vercel.com/v3/deployments/{dep_id}/events",
        headers=HEADERS,
        params={"builds": 1, "limit": -1},  # -1 = unlimited
        timeout=30
    )
    r.raise_for_status()
    events = r.json()
    
    print(f"✅ Received {len(events)} event(s)")
    
    # DEBUG: Print full JSON structure of first event
    if events:
        print("\n🔍 DEBUG - First event full JSON structure:")
        print("-" * 60)
        print(json.dumps(events[0], indent=2)[:2000])  # First 2000 chars
        print("-" * 60)
    
    # Filter for error-related events
    error_events = []
    all_stderr = []
    
    for event in events:
        event_type = event.get("type", "")
        # FIX: Text is directly in event.text, not event.payload.text
        text = event.get("text", "")
        
        # Collect all stderr events
        if event_type == "stderr" and text and text.strip():
            all_stderr.append(text)
        
        # Collect error-related events with actual content
        if text and text.strip():  # Only non-empty text
            if event_type in ["stderr", "command"] or any(word in text.lower() for word in ["error", "failed", "exception", "parse", "syntax"]):
                error_events.append((event_type, text))
    
    print(f"\n📊 Event statistics:")
    print(f"   Total events: {len(events)}")
    print(f"   stderr events: {len(all_stderr)}")
    print(f"   Error-related: {len(error_events)}")
    
    if error_events:
        print(f"\n⚠️  Error-related log entries:")
        print("-" * 60)
        for i, (event_type, log) in enumerate(error_events[:30], 1):  # Show first 30
            print(f"{i}. [{event_type}] {log[:200]}{'...' if len(log) > 200 else ''}")
    elif all_stderr:
        print(f"\n⚠️  All stderr output:")
        print("-" * 60)
        for i, log in enumerate(all_stderr[:20], 1):
            print(f"{i}. {log[:200]}{'...' if len(log) > 200 else ''}")
    else:
        print("\n✅ No errors or stderr output found!")
        print("\nShowing first 15 events of any type:")
        print("-" * 60)
        for i, event in enumerate(events[:15], 1):
            event_type = event.get("type", "N/A")
            text = event.get("text", "")[:150]
            print(f"{i}. [{event_type}] {text if text else '(no text)'}")
    
except Exception as e:
    print(f"❌ Failed to fetch build logs: {e}")
    exit(1)

print("\n" + "=" * 60)
print("✅ TEST COMPLETE!")
print("=" * 60)
