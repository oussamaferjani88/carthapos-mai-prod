class ApiResponse {
  static success(res, data, message = 'Success', statusCode = 200) {
    return res.status(statusCode).json({
      status: 'success',
      message,
      data
    });
  }

  static created(res, data, message = 'Resource created successfully') {
    return res.status(201).json({
      status: 'success',
      message,
      data
    });
  }

  static noContent(res) {
    return res.status(204).send();
  }

  static error(res, message = 'An error occurred', statusCode = 500, errors = null) {
    const response = {
      status: 'error',
      message
    };

    if (errors) {
      response.errors = errors;
    }

    return res.status(statusCode).json(response);
  }

  static validationError(res, errors) {
    return res.status(400).json({
      status: 'fail',
      message: 'Validation failed',
      errors
    });
  }

  static paginated(res, data, pagination, message = 'Success') {
    return res.status(200).json({
      status: 'success',
      message,
      data,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total: pagination.total,
        totalPages: Math.ceil(pagination.total / pagination.limit)
      }
    });
  }
}

module.exports = ApiResponse;
