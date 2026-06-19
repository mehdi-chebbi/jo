import Swal from 'sweetalert2';

// Helper functions for common alert types
export const showAlert = {
  success: (title: string, text?: string) => {
    return Swal.fire({
      icon: 'success',
      title,
      text,
      confirmButtonText: 'OK',
      buttonsStyling: false,
      customClass: {
        confirmButton: 'swal2-confirm'
      },
      showClass: {
        popup: 'animate__animated animate__fadeInDown'
      },
      hideClass: {
        popup: 'animate__animated animate__fadeOutUp'
      }
    });
  },
  
  error: (title: string, text?: string) => {
    return Swal.fire({
      icon: 'error',
      title,
      text,
      confirmButtonText: 'OK',
      buttonsStyling: false,
      customClass: {
        confirmButton: 'swal2-confirm'
      },
      showClass: {
        popup: 'animate__animated animate__fadeInDown'
      },
      hideClass: {
        popup: 'animate__animated animate__fadeOutUp'
      }
    });
  },
  
  warning: (title: string, text?: string) => {
    return Swal.fire({
      icon: 'warning',
      title,
      text,
      confirmButtonText: 'OK',
      buttonsStyling: false,
      customClass: {
        confirmButton: 'swal2-confirm'
      },
      showClass: {
        popup: 'animate__animated animate__fadeInDown'
      },
      hideClass: {
        popup: 'animate__animated animate__fadeOutUp'
      }
    });
  },
  
  info: (title: string, text?: string) => {
    return Swal.fire({
      icon: 'info',
      title,
      text,
      confirmButtonText: 'OK',
      buttonsStyling: false,
      customClass: {
        confirmButton: 'swal2-confirm'
      },
      showClass: {
        popup: 'animate__animated animate__fadeInDown'
      },
      hideClass: {
        popup: 'animate__animated animate__fadeOutUp'
      }
    });
  },
  
  confirm: (title: string, text?: string, confirmText: string = 'Yes', cancelText: string = 'Cancel') => {
    return Swal.fire({
      title,
      text,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: confirmText,
      cancelButtonText: cancelText,
      buttonsStyling: false,
      customClass: {
        confirmButton: 'swal2-confirm',
        cancelButton: 'swal2-cancel'
      },
      showClass: {
        popup: 'animate__animated animate__fadeInDown'
      },
      hideClass: {
        popup: 'animate__animated animate__fadeOutUp'
      }
    });
  },
  
  input: (title: string, inputPlaceholder: string = 'Enter value...') => {
    return Swal.fire({
      title,
      input: 'text',
      inputPlaceholder,
      inputAttributes: {
        style: 'box-sizing: border-box; width: 80%; max-width: 300px; margin: 0.5rem auto 0 auto; display: block;'
      },
      showCancelButton: true,
      confirmButtonText: 'OK',
      cancelButtonText: 'Annuler',
      buttonsStyling: false,
      customClass: {
        confirmButton: 'swal2-confirm',
        cancelButton: 'swal2-cancel',
        input: 'swal2-input-custom'
      },
      showClass: {
        popup: 'animate__animated animate__fadeInDown'
      },
      hideClass: {
        popup: 'animate__animated animate__fadeOutUp'
      }
    });
  }
};

export default Swal;