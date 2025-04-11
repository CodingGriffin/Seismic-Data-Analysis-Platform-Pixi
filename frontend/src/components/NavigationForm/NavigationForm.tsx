import { Form } from "react-router";

const NavigationForm = () => {
  return (
    <Form action="/disper" method="get">
      <input type="hidden" name="source" value="dashboard" />
      <button type="submit" className="btn btn-primary">
        Navigate via Form
      </button>
    </Form>
  );
};

export default NavigationForm;