import React, {PropTypes} from 'react';
import InputContainer from './AvInputContainer';
import AvValidator from './AvValidator';
import { Form } from 'reactstrap';
import classNames from 'classnames';
import _get from 'lodash.get';
import _set from 'lodash.set';
import isString from 'lodash.isstring';

const getInputErrorMessage =  (input, ruleName) => {
  let errorMessage = input.props.errorMessage;

  if (typeof errorMessage === 'object') {
    return errorMessage[ruleName];
  } else {
    return errorMessage;
  }
};

export default class AvForm extends InputContainer {
  static childContextTypes = {
    FormCtrl: PropTypes.object.isRequired,
  };

  static contextTypes = {
    FormCtrl: PropTypes.object,
  };

  static propTypes = {
    tag: PropTypes.oneOfType([
      PropTypes.func,
      PropTypes.string,
    ]),
    className: PropTypes.string,
    model: PropTypes.object,
    method: PropTypes.oneOf(['get', 'post']),
    onSubmit: PropTypes.func,
    validate: PropTypes.oneOfType([
      PropTypes.func,
      PropTypes.array,
    ]),
    onValidSubmit: PropTypes.func,
    onInvalidSubmit: PropTypes.func,
    validationEvent: PropTypes.oneOf([
      'onInput', 'onChange', 'onBlur', 'onFocus',
    ]),
    errorMessage: PropTypes.oneOfType([
      PropTypes.object,
      PropTypes.string,
      PropTypes.node,
    ]),
  };

  static defaultProps = {
    tag: Form,
    model: {},
    validationEvent: 'onChange',
    method: 'get',
    onSubmit: () => {},
    onKeyDown: () => {},
    onValidSubmit: () => {},
    onInvalidSubmit: () => {},
  };

  constructor (props) {
    super(props);

    this.state = {
      invalidInputs: {},
      dirtyInputs: {},
      touchedInputs: {},
      badInputs: {},
      submitted: false,
    };

    this.handleSubmit = ::this.handleSubmit;
    this.handleNonFormSubmission = ::this.handleNonFormSubmission;
  }

  getChildContext () {
    return {
      FormCtrl: {
        inputs: this._inputs,
        getDefaultValue: ::this.getDefaultValue,
        getInputState: ::this.getInputState,
        hasError: this.state.invalidInputs,
        isDirty: this.state.dirtyInputs,
        isTouched: this.state.touchedInputs,
        isBad: this.state.badInputs,
        setDirty: ::this.setDirty,
        setTouched: ::this.setTouched,
        setBad: ::this.setBad,
        register: ::this.registerInput,
        unregister: ::this.unregisterInput,
        validate: ::this.validateInput,
        validationEvent: this.props.validationEvent,
        parent: this.context.FormCtrl || null,
      },
    };
  }

  componentWillMount () {
    super.componentWillMount();

    this._validators = {};
  }

  registerInput (input) {
    super.registerInput(input);

    if (typeof input.validations === 'object') {
      this._validators[input.props.name] = this.compileValidationRules(input, input.validations);
    }
  }

  unregisterInput (input) {
    super.unregisterInput(input);

    delete this._validators[input.props.name];
  }

  handleNonFormSubmission (event) {
    if (this.props.onKeyDown(event) !== false) {
      if (event.type === 'keydown' && (event.which === 13 || event.keyCode === 13 || event.key === 'Enter')) {
        event.stopPropagation();
        event.preventDefault();
        this.handleSubmit(...arguments);
      }
    }
  }

  render () {
    const {
      tag: Tag,
      errorMessage,
      model,
      onValidSubmit,
      onInvalidSubmit,
      validate,
      validateOne,
      validateAll,
      validationEvent,
      className,
      ...attributes,
    } = this.props;

    const classes = classNames(
      className,
      this.state.submitted ? 'av-submitted' : false,
      Object.keys(this.state.invalidInputs).length > 0 ? 'av-invalid' : 'av-valid'
    );

    if (Tag !== 'form' && Tag !== Form) {
      attributes.onKeyDown = this.handleNonFormSubmission;
    }

    return (
      <Tag noValidate
        action="#"
        {...attributes}
        className={classes}
        onSubmit={this.handleSubmit} />
    );
  }

  getValues () {
    return Object.keys(this._inputs).reduce((values, inputName) => {
      _set(values, inputName, this.getValue(inputName));

      return values;
    }, {});
  }

  submit (...args) {
    this.handleSubmit(...args);
  }

  reset () {
    Object.keys(this._inputs).forEach(inputName => this._inputs[inputName].reset());
  }

  validateInput (name) {
    this.validateOne(name, this.getValues());
  }

  getInputState (inputName) {
    let errorMessage = this.isTouched(inputName) && this.hasError(inputName);
    const error = !!errorMessage;
    let color;

    if (error) {
      color = 'danger';
      if (errorMessage === true) {
        errorMessage = 'This field is invalid';
      }
    }

    return {color, error, errorMessage};
  };

  hasError (inputName) {
    return inputName ? !!this.state.invalidInputs[inputName] : Object.keys(this.state.invalidInputs).length > 0;
  }

  isDirty (inputName) {
    return inputName ? !!this.state.dirtyInputs[inputName] : Object.keys(this.state.dirtyInputs).length > 0;
  }

  isTouched (inputName) {
    return inputName ? !!this.state.touchedInputs[inputName] : Object.keys(this.state.touchedInputs).length > 0;
  }

  isBad (inputName) {
    return inputName ? !!this.state.badInputs[inputName] : Object.keys(this.state.badInputs).length > 0;
  }

  setError (inputName, error = true, errText = error) {
    if (error && !isString(errText) && typeof errText !== 'boolean') {
      errText = errText + '';
    }

    const currentError = this.hasError(inputName);
    if (currentError === errText) return;

    let invalidInputs = this.state.invalidInputs;
    if (error) {
      invalidInputs[inputName] = errText || true;
    } else {
      delete invalidInputs[inputName];
    }

    invalidInputs = {...this.state.invalidInputs};
    this.setState({invalidInputs});
  }

  setDirty (inputs, dirty = true) {
    let dirtyInputs = this.state.dirtyInputs;
    if (!Array.isArray(inputs)) {
      inputs = [inputs];
    }
    inputs.forEach(inputName => {
      if (dirty) {
        dirtyInputs[inputName] = true;
      } else {
        delete dirtyInputs[inputName];
      }
    });

    dirtyInputs = {...this.state.dirtyInputs};
    this.setState({dirtyInputs});
  }

  setTouched (inputs, touched = true) {
    let touchedInputs = this.state.touchedInputs;
    if (!Array.isArray(inputs)) {
      inputs = [inputs];
    }
    inputs.forEach(inputName => {
      if (touched) {
        touchedInputs[inputName] = true;
      } else {
        delete touchedInputs[inputName];
      }
    });

    touchedInputs = {...this.state.touchedInputs};
    this.setState({touchedInputs});
  }

  setBad (inputs, isBad = true) {
    let badInputs = this.state.badInputs;
    if (!Array.isArray(inputs)) {
      inputs = [inputs];
    }
    inputs.forEach(inputName => {
      if (isBad) {
        badInputs[inputName] = true;
      } else {
        delete badInputs[inputName];
      }
    });

    badInputs = {...this.state.badInputs};
    this.setState({badInputs});
  }

  validateOne (inputName, context) {
    const input = this._inputs[inputName];

    if (Array.isArray(input)) {
      throw new Error(`Multiple inputs cannot use the same name: "${inputName}"`);
    }

    const value = _get(context, inputName);
    const validate = input.validations;
    let isValid = true;
    let result;
    let error;

    if (typeof validate === 'function') {
      result = validate(value, context, input);
    } else if (typeof validate === 'object') {
      result = this._validators[inputName](value, context);
    } else {
      result = true;
    }

    if (result !== true) {
      isValid = false;

      if (isString(result)) {
        error = result;
      }
    }

    this.setError(inputName, !isValid, error);

    return isValid;
  }

  validateAll (context) {
    const errors = [];
    let isValid = true;

    Object.keys(this._inputs).forEach(inputName => {
      if (!this.validateOne(inputName, context)) {
        isValid = false;
        errors.push(inputName);
      }
    });

    if (this.props.validate) {
      let formLevelValidation = this.props.validate;
      if (!Array.isArray(formLevelValidation)) {
        formLevelValidation = [formLevelValidation];
      }

      if (!formLevelValidation.every(validationFn => validationFn(context))) {
        isValid = false;
        errors.push('*');
      }
    }

    return {
      isValid: isValid,
      errors: errors,
    };
  }

  compileValidationRules (input, ruleProp) {
    return (val, context) => {
      if (this.isBad(input.props.name)) {
        return false;
      }

      let result = true;
      let ruleResult;
      Object.keys(ruleProp).some(rule => {
        if (typeof ruleProp[rule] === 'function') {
          ruleResult = ruleProp[rule](val, context, input);
        } else {
          if (typeof AvValidator[rule] !== 'function') {
            throw new Error(`Invalid input validation rule: "${rule}"`);
          }

          ruleResult = AvValidator[rule](val, context, ruleProp[rule], input);
        }

        if (result === true && ruleResult !== true) {
          result = isString(ruleResult) && ruleResult ||
            getInputErrorMessage(input, rule) ||
            getInputErrorMessage(this, rule) || false;
        }

        return result !== true;
      });

      return result;
    };
  }

  getDefaultValue (inputName) {
    return _get(this.props.model, inputName)
  }

  getValue (inputName) {
    const input = this._inputs[inputName];

    if (Array.isArray(input)) {
      throw new Error(`Multiple inputs cannot use the same name: "${inputName}"`);
    }

    return input.getValue();
  }

  handleSubmit (e) {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
    }

    const values = this.getValues();

    const {isValid, errors} = this.validateAll(values);

    this.setTouched(Object.keys(this._inputs));

    this.props.onSubmit(e, errors, values);
    if (isValid) {
      this.props.onValidSubmit(e, values);
    } else {
      this.props.onInvalidSubmit(e, errors, values);
    }

    !this.state.submitted && this.setState({submitted: true});
  }
}
