#!/usr/bin/env python3
"""
Kestra YAML Validator
Validates Kestra flow YAML files against schema requirements
"""

import sys
import yaml
from pathlib import Path


class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    RESET = '\033[0m'


def print_success(msg):
    print(f"{Colors.GREEN}✓{Colors.RESET} {msg}")


def print_error(msg):
    print(f"{Colors.RED}✗{Colors.RESET} {msg}")


def print_warning(msg):
    print(f"{Colors.YELLOW}⚠{Colors.RESET} {msg}")


def print_info(msg):
    print(f"{Colors.BLUE}ℹ{Colors.RESET} {msg}")


def validate_yaml_syntax(file_path):
    """Check if YAML is valid syntax"""
    print(f"\n{Colors.BLUE}Checking YAML syntax...{Colors.RESET}")
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = yaml.safe_load(f)
        print_success("YAML syntax is valid")
        return content, True
    except yaml.YAMLError as e:
        print_error(f"YAML syntax error: {e}")
        return None, False
    except Exception as e:
        print_error(f"Error reading file: {e}")
        return None, False


def validate_required_fields(data):
    """Check required top-level fields"""
    print(f"\n{Colors.BLUE}Checking required fields...{Colors.RESET}")
    required = ['id', 'namespace', 'tasks']
    errors = []
    
    for field in required:
        if field not in data:
            errors.append(f"Missing required field: {field}")
            print_error(f"Missing required field: {field}")
        else:
            print_success(f"Found required field: {field}")
    
    return len(errors) == 0


def validate_tasks(data):
    """Validate tasks structure"""
    print(f"\n{Colors.BLUE}Validating tasks...{Colors.RESET}")
    
    if 'tasks' not in data:
        print_error("No tasks defined")
        return False
    
    tasks = data['tasks']
    if not isinstance(tasks, list):
        print_error("Tasks must be a list")
        return False
    
    if len(tasks) == 0:
        print_error("At least one task is required")
        return False
    
    print_success(f"Found {len(tasks)} task(s)")
    
    errors = []
    for i, task in enumerate(tasks):
        task_id = task.get('id', f'task-{i}')
        print(f"\n  Validating task: {task_id}")
        
        # Check required task fields
        if 'id' not in task:
            errors.append(f"Task {i} missing 'id'")
            print_error(f"  Missing 'id'")
        else:
            print_success(f"  Has 'id': {task['id']}")
        
        if 'type' not in task:
            errors.append(f"Task '{task_id}' missing 'type'")
            print_error(f"  Missing 'type'")
        else:
            print_success(f"  Has 'type': {task['type']}")
        
        # Validate specific task types
        task_type = task.get('type', '')
        
        if 'shell.Script' in task_type:
            # Check script task specifics
            if 'script' not in task:
                errors.append(f"Script task '{task_id}' missing 'script' field")
                print_error(f"  Missing 'script' field")
            else:
                print_success(f"  Has 'script' field")
            
            # Check retry structure if present
            if 'retry' in task:
                retry = task['retry']
                if 'type' not in retry:
                    errors.append(f"Task '{task_id}' retry missing 'type'")
                    print_error(f"  Retry missing 'type'")
                else:
                    print_success(f"  Retry type: {retry['type']}")
                
                # Check for common typo: maxAttempt vs maxAttempts
                if 'maxAttempt' in retry:
                    print_warning(f"  Found 'maxAttempt' (should be 'maxAttempts' in latest Kestra)")
                elif 'maxAttempts' in retry:
                    print_success(f"  Has 'maxAttempts': {retry['maxAttempts']}")
            
            # Check taskRunner
            if 'taskRunner' in task:
                runner = task['taskRunner']
                if 'type' not in runner:
                    errors.append(f"Task '{task_id}' taskRunner missing 'type'")
                    print_error(f"  TaskRunner missing 'type'")
                else:
                    print_success(f"  TaskRunner type: {runner['type']}")
    
    if errors:
        print(f"\n{Colors.RED}Found {len(errors)} error(s) in tasks{Colors.RESET}")
        return False
    
    print_success(f"\nAll {len(tasks)} task(s) are valid")
    return True


def validate_inputs(data):
    """Validate inputs structure"""
    print(f"\n{Colors.BLUE}Validating inputs...{Colors.RESET}")
    
    if 'inputs' not in data:
        print_info("No inputs defined (optional)")
        return True
    
    inputs = data['inputs']
    if not isinstance(inputs, list):
        print_error("Inputs must be a list")
        return False
    
    print_success(f"Found {len(inputs)} input(s)")
    
    for inp in inputs:
        inp_id = inp.get('id', 'unknown')
        if 'id' not in inp:
            print_error(f"  Input missing 'id'")
            return False
        if 'type' not in inp:
            print_error(f"  Input '{inp_id}' missing 'type'")
            return False
        print_success(f"  Input '{inp_id}' (type: {inp['type']})")
    
    return True


def validate_outputs(data):
    """Validate outputs structure"""
    print(f"\n{Colors.BLUE}Validating outputs...{Colors.RESET}")
    
    if 'outputs' not in data:
        print_info("No outputs defined (optional)")
        return True
    
    outputs = data['outputs']
    if not isinstance(outputs, list):
        print_error("Outputs must be a list")
        return False
    
    print_success(f"Found {len(outputs)} output(s)")
    
    for out in outputs:
        out_id = out.get('id', 'unknown')
        if 'id' not in out:
            print_error(f"  Output missing 'id'")
            return False
        if 'type' not in out:
            print_error(f"  Output '{out_id}' missing 'type'")
            return False
        if 'value' not in out:
            print_error(f"  Output '{out_id}' missing 'value'")
            return False
        print_success(f"  Output '{out_id}' (type: {out['type']})")
    
    return True


def check_kestra_syntax(data):
    """Check for Kestra-specific syntax issues"""
    print(f"\n{Colors.BLUE}Checking Kestra-specific syntax...{Colors.RESET}")
    
    # Check for old maxAttempt vs new maxAttempts
    yaml_str = yaml.dump(data)
    
    if 'maxAttempt:' in yaml_str and 'maxAttempts:' not in yaml_str:
        print_warning("Using 'maxAttempt' (older syntax). Consider 'maxAttempts' for latest Kestra")
    
    # Check for proper namespace format
    namespace = data.get('namespace', '')
    if '/' in namespace or '\\' in namespace:
        print_warning(f"Namespace '{namespace}' contains path separators. Should be a simple identifier.")
    else:
        print_success(f"Namespace format looks good: {namespace}")
    
    # Check ID format
    flow_id = data.get('id', '')
    if ' ' in flow_id:
        print_error(f"Flow ID '{flow_id}' contains spaces. Use dashes or underscores.")
        return False
    else:
        print_success(f"Flow ID format looks good: {flow_id}")
    
    return True


def validate_file(file_path):
    """Main validation function"""
    print(f"\n{'='*60}")
    print(f"{Colors.BLUE}Validating Kestra Flow: {file_path}{Colors.RESET}")
    print(f"{'='*60}")
    
    # Check if file exists
    if not Path(file_path).exists():
        print_error(f"File not found: {file_path}")
        return False
    
    # Parse YAML
    data, syntax_ok = validate_yaml_syntax(file_path)
    if not syntax_ok:
        return False
    
    # Run validations
    validations = [
        validate_required_fields(data),
        validate_inputs(data),
        validate_tasks(data),
        validate_outputs(data),
        check_kestra_syntax(data)
    ]
    
    # Summary
    print(f"\n{'='*60}")
    if all(validations):
        print(f"{Colors.GREEN}✓ VALIDATION PASSED{Colors.RESET}")
        print(f"\nThe YAML file is valid and ready to import into Kestra!")
        print(f"\nTo import:")
        print(f"  1. Open Kestra UI (http://localhost:8080)")
        print(f"  2. Go to Flows")
        print(f"  3. Click 'Create' or 'Import'")
        print(f"  4. Paste the YAML content")
        print(f"{'='*60}\n")
        return True
    else:
        print(f"{Colors.RED}✗ VALIDATION FAILED{Colors.RESET}")
        print(f"\nPlease fix the errors above before importing to Kestra.")
        print(f"{'='*60}\n")
        return False


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(f"Usage: python {sys.argv[0]} <yaml-file>")
        print(f"\nExample:")
        print(f"  python {sys.argv[0]} flows/simple-builder-v2.yml")
        sys.exit(1)
    
    yaml_file = sys.argv[1]
    success = validate_file(yaml_file)
    sys.exit(0 if success else 1)
